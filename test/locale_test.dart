import 'dart:convert';
import 'dart:io';
import 'dart:ui';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:oneroof/l10n/locale_controller.dart';

void main() {
  group('locale persistence', () {
    test('switching to Hindi persists and reloads correctly', () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});

      // Load defaults to English.
      final LocaleController ctrl = await LocaleController.load();
      expect(ctrl.locale.languageCode, equals('en'));

      // Switch to Hindi.
      await ctrl.setLocale(const Locale('hi'));
      expect(ctrl.locale.languageCode, equals('hi'));

      // Reload from storage — should still be Hindi.
      final LocaleController reloaded = await LocaleController.load();
      expect(reloaded.locale.languageCode, equals('hi'));
    });

    test('switching to Malayalam persists across restart', () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});

      final LocaleController ctrl = await LocaleController.load();
      await ctrl.setLocale(const Locale('ml'));

      final LocaleController reloaded = await LocaleController.load();
      expect(reloaded.locale.languageCode, equals('ml'));
    });

    test('notifyListeners fires on locale change', () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});

      final LocaleController ctrl = await LocaleController.load();
      bool notified = false;
      ctrl.addListener(() => notified = true);
      await ctrl.setLocale(const Locale('ta'));
      expect(notified, isTrue);
    });

    test('setting same locale does not notify', () async {
      SharedPreferences.setMockInitialValues(<String, Object>{});

      final LocaleController ctrl = await LocaleController.load();
      bool notified = false;
      ctrl.addListener(() => notified = true);
      await ctrl.setLocale(const Locale('en')); // same as default
      expect(notified, isFalse);
    });
  });

  group('ARB key parity', () {
    test('all 5 ARB files have identical key sets', () {
      final Directory l10nDir = Directory('lib/l10n');
      final List<String> arbFiles = <String>[
        'app_en.arb',
        'app_hi.arb',
        'app_ml.arb',
        'app_ta.arb',
        'app_kn.arb',
      ];

      // Parse each ARB, collect its user-facing keys (exclude @@-prefixed
      // metadata keys and @-prefixed description keys).
      final Map<String, Set<String>> keysByFile = <String, Set<String>>{};

      for (final String filename in arbFiles) {
        final File file = File('${l10nDir.path}/$filename');
        expect(file.existsSync(), isTrue,
            reason: '$filename must exist');

        final Map<String, dynamic> arb =
            jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;

        final Set<String> keys = arb.keys
            .where((k) => !k.startsWith('@@') && !k.startsWith('@'))
            .toSet();

        keysByFile[filename] = keys;
      }

      final Set<String> referenceKeys = keysByFile['app_en.arb']!;

      for (final MapEntry<String, Set<String>> entry
          in keysByFile.entries) {
        final String filename = entry.key;
        final Set<String> keys = entry.value;

        // Keys in English but missing from this locale.
        final Set<String> missing = referenceKeys.difference(keys);
        expect(missing, isEmpty,
            reason: '$filename is missing keys: $missing');

        // Keys in this locale but not in English (extras).
        final Set<String> extras = keys.difference(referenceKeys);
        expect(extras, isEmpty,
            reason: '$filename has extra keys: $extras');
      }
    });
  });
}
