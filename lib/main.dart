import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'l10n/app_localizations.dart';
import 'l10n/locale_controller.dart';
import 'mesh/device_identity.dart';
import 'screens/home/home_screen.dart';
import 'screens/mesh/mesh_screen.dart';
import 'screens/profile/profile_screen.dart';
import 'screens/reports/reports_screen.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Fix this device's mesh identity at start-up rather than letting the first
  // screen that needs it decide when the id comes into being.
  DeviceIdentity.initialise();
  runApp(SamanvayApp(localeController: await LocaleController.load()));
}

class SamanvayApp extends StatelessWidget {
  const SamanvayApp({super.key, required this.localeController});
  final LocaleController localeController;

  @override
  Widget build(BuildContext context) {
    return AppLocaleScope(
      controller: localeController,
      child: MaterialApp(
      title: 'Samanvay Responder',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      locale: localeController.locale,
      localizationsDelegates: const <LocalizationsDelegate<dynamic>>[
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      // While testing we skip auth and drop straight into the tab shell.
      // TODO(backend): switch this to `const LoginScreen()` once the OTP
      // endpoint is live, and gate it on a stored session token.
      home: const RootNav(),
      ),
    );
  }
}

/// Bottom-tab shell for the whole app.
///
/// Uses an [IndexedStack] rather than swapping the body widget so every tab
/// keeps its state when the responder switches away — this matters most for
/// the Mesh tab, where changing tabs must never tear down a live P2P group.
class RootNav extends StatefulWidget {
  const RootNav({super.key});

  @override
  State<RootNav> createState() => _RootNavState();
}

class _RootNavState extends State<RootNav> {
  int _index = 0;

  static const List<Widget> _tabs = <Widget>[
    HomeScreen(),
    MeshScreen(),
    ReportsScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final AppLocalizations l10n = AppLocalizations.of(context)!;
    return Scaffold(
      body: IndexedStack(index: _index, children: _tabs),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (int i) => setState(() => _index = i),
        iconSize: 26,
        items: <BottomNavigationBarItem>[
          BottomNavigationBarItem(
            icon: const Icon(Icons.dashboard_outlined),
            activeIcon: const Icon(Icons.dashboard),
            label: l10n.home,
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.hub_outlined),
            activeIcon: const Icon(Icons.hub),
            label: l10n.mesh,
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.description_outlined),
            activeIcon: const Icon(Icons.description),
            label: l10n.reports,
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.person_outline),
            activeIcon: const Icon(Icons.person),
            label: l10n.profile,
          ),
        ],
      ),
    );
  }
}
