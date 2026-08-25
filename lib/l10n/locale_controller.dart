import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persisted app language. Protocol values never pass through this class.
class LocaleController extends ChangeNotifier {
  LocaleController._(this._locale);

  static const String _key = 'preferred_locale';
  Locale _locale;

  Locale get locale => _locale;

  static Future<LocaleController> load() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String code = prefs.getString(_key) ?? 'en';
    return LocaleController._(Locale(code));
  }

  Future<void> setLocale(Locale locale) async {
    if (_locale == locale) return;
    _locale = locale;
    notifyListeners();
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, locale.languageCode);
  }
}

class AppLocaleScope extends InheritedNotifier<LocaleController> {
  const AppLocaleScope({super.key, required LocaleController controller, required super.child}) : super(notifier: controller);

  static LocaleController of(BuildContext context) => context.dependOnInheritedWidgetOfExactType<AppLocaleScope>()!.notifier!;
}
