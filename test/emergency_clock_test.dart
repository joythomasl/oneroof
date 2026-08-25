import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:oneroof/l10n/app_localizations.dart';
import 'package:oneroof/theme/app_theme.dart';
import 'package:oneroof/widgets/emergency_clock.dart';

void main() {
  /// Wraps [EmergencyClock] in a MaterialApp with localization delegates
  /// so l10n strings resolve during tests.
  Widget wrap(EmergencyClock clock) => MaterialApp(
        theme: AppTheme.dark,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        locale: const Locale('en'),
        home: Scaffold(body: clock),
      );

  group('countdown crossing zero', () {
    testWidgets('reads "Recovery phase due" after 24 hours',
        (WidgetTester tester) async {
      // stateEnteredAt was 25 hours ago → well past the 24-hour mark.
      final DateTime twentyFiveHoursAgo =
          DateTime.now().subtract(const Duration(hours: 25));

      await tester.pumpWidget(wrap(
        EmergencyClock(
          stateEnteredAt: twentyFiveHoursAgo,
          now: () => DateTime.now(),
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Recovery phase due'), findsOneWidget);
      // Must NOT show a negative time string.
      expect(find.textContaining('-'), findsNothing);
    });

    testWidgets('reads "Recovery phase due" at exactly 24 hours',
        (WidgetTester tester) async {
      final DateTime now = DateTime.now();
      final DateTime exactlyTwentyFourHoursAgo =
          now.subtract(const Duration(hours: 24));

      await tester.pumpWidget(wrap(
        EmergencyClock(
          stateEnteredAt: exactlyTwentyFourHoursAgo,
          now: () => now,
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Recovery phase due'), findsOneWidget);
    });

    testWidgets('shows countdown before 24 hours',
        (WidgetTester tester) async {
      final DateTime now = DateTime.now();
      final DateTime oneHourAgo = now.subtract(const Duration(hours: 1));

      await tester.pumpWidget(wrap(
        EmergencyClock(
          stateEnteredAt: oneHourAgo,
          now: () => now,
        ),
      ));
      await tester.pumpAndSettle();

      // Should show "23h 0m to recovery phase"
      expect(find.textContaining('to recovery phase'), findsOneWidget);
      expect(find.text('Recovery phase due'), findsNothing);
    });
  });

  group('elapsed colour thresholds', () {
    testWidgets('green under 6 hours', (WidgetTester tester) async {
      final DateTime now = DateTime.now();
      final DateTime twoHoursAgo = now.subtract(const Duration(hours: 2));

      await tester.pumpWidget(wrap(
        EmergencyClock(stateEnteredAt: twoHoursAgo, now: () => now),
      ));
      await tester.pumpAndSettle();

      // Verify the elapsed text exists and the colour is green (p3).
      final Text elapsedText = tester.widget<Text>(
        find.text(EmergencyClock.formatDuration(
            now.difference(twoHoursAgo))),
      );
      expect(elapsedText.style?.color, equals(AppColors.p3));
    });

    testWidgets('amber between 6 and 20 hours',
        (WidgetTester tester) async {
      final DateTime now = DateTime.now();
      final DateTime tenHoursAgo = now.subtract(const Duration(hours: 10));

      await tester.pumpWidget(wrap(
        EmergencyClock(stateEnteredAt: tenHoursAgo, now: () => now),
      ));
      await tester.pumpAndSettle();

      final Text elapsedText = tester.widget<Text>(
        find.text(EmergencyClock.formatDuration(
            now.difference(tenHoursAgo))),
      );
      expect(elapsedText.style?.color, equals(AppColors.p2));
    });

    testWidgets('red past 20 hours', (WidgetTester tester) async {
      final DateTime now = DateTime.now();
      final DateTime twentyTwoHoursAgo =
          now.subtract(const Duration(hours: 22));

      await tester.pumpWidget(wrap(
        EmergencyClock(stateEnteredAt: twentyTwoHoursAgo, now: () => now),
      ));
      await tester.pumpAndSettle();

      final Text elapsedText = tester.widget<Text>(
        find.text(EmergencyClock.formatDuration(
            now.difference(twentyTwoHoursAgo))),
      );
      expect(elapsedText.style?.color, equals(AppColors.p0));
    });
  });

  group('static helpers', () {
    test('formatDuration pads correctly', () {
      expect(
        EmergencyClock.formatDuration(
            const Duration(hours: 1, minutes: 5, seconds: 3)),
        equals('01:05:03'),
      );
      expect(
        EmergencyClock.formatDuration(const Duration(hours: 0)),
        equals('00:00:00'),
      );
    });

    test('recoveryDue is false before 24h, true at and after', () {
      final DateTime t = DateTime(2026, 8, 25, 10, 0, 0);
      expect(
        EmergencyClock.recoveryDue(t, t.add(const Duration(hours: 23))),
        isFalse,
      );
      expect(
        EmergencyClock.recoveryDue(t, t.add(const Duration(hours: 24))),
        isTrue,
      );
      expect(
        EmergencyClock.recoveryDue(t, t.add(const Duration(hours: 25))),
        isTrue,
      );
    });
  });
}
