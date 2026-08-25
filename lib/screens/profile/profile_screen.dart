import 'dart:async';

import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../l10n/locale_controller.dart';
import '../../mesh/device_identity.dart';
import '../../theme/app_theme.dart';

/// Responder profile — identity, capabilities, device, shift, session and
/// language settings.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Timer? _ticker;

  // TODO(backend): these come from the authenticated session / responder API.
  static const String _name = 'S. Ramesh';
  static const String _rank = 'Sub-Inspector';
  static const String _agency = 'NDRF, 4th Battalion';
  static const String _callsign = 'DELTA-12';
  static const String _serviceNumber = 'NDRF-2019-4471';
  static const String _assignedArea = 'Sector 4 — Riverfront';
  static const List<String> _capabilities = <String>[
    'Swift Water Rescue',
    'Medical First Responder',
    'Structural Assessment',
    'Boat Operations',
  ];

  // TODO(backend): token expiry from auth. Hardcoded to ~41 hours from now.
  late final DateTime _tokenExpiry =
      DateTime.now().add(const Duration(hours: 41, minutes: 12));

  // TODO(backend): shift data from the session.
  static const double _hoursOnTask = 6.7;
  static const String _lastCheckIn = '11:42';
  static const String _nextCheckIn = '12:42';

  static const Map<String, String> _languageLabels = <String, String>{
    'en': 'English',
    'hi': 'हिन्दी',
    'ml': 'മലയാളം',
    'ta': 'தமிழ்',
    'kn': 'ಕನ್ನಡ',
  };

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(const Duration(seconds: 60), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final AppLocalizations l10n = AppLocalizations.of(context)!;
    final TextTheme text = Theme.of(context).textTheme;
    final LocaleController localeCtrl = AppLocaleScope.of(context);
    final Duration tokenRemaining = _tokenExpiry.difference(DateTime.now());
    final int tokenHours =
        tokenRemaining.isNegative ? 0 : tokenRemaining.inHours;
    final int tokenMinutes =
        tokenRemaining.isNegative ? 0 : tokenRemaining.inMinutes % 60;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.profile)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: <Widget>[
          // ── Identity ──
          _sectionLabel(context, l10n.identity),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      CircleAvatar(
                        radius: 30,
                        backgroundColor: AppColors.accent.withValues(alpha: 0.2),
                        child: Text(
                          _name.split(' ').map((s) => s[0]).take(2).join(),
                          style: text.titleLarge
                              ?.copyWith(color: AppColors.accent),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Text(_name, style: text.titleLarge),
                            const SizedBox(height: 2),
                            Text(
                              '$_rank · $_callsign',
                              style: text.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  _infoRow(context, l10n.name, _name),
                  _infoRow(context, l10n.rank, _rank),
                  _infoRow(context, l10n.agency, _agency),
                  _infoRow(context, l10n.callsign, _callsign),
                  _infoRow(context, l10n.serviceNumber, _serviceNumber),
                  _infoRow(context, l10n.assignedArea, _assignedArea),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          // ── Capabilities ──
          _sectionLabel(context, l10n.capabilities),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _capabilities
                    .map(
                      (c) => StatusBadge(
                        label: c,
                        color: AppColors.info,
                        dense: true,
                      ),
                    )
                    .toList(),
              ),
            ),
          ),

          const SizedBox(height: 20),

          // ── Device ──
          _sectionLabel(context, l10n.device),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  _infoRow(
                    context,
                    l10n.boundDevice,
                    DeviceIdentity.shortDeviceId,
                  ),
                  _infoRow(
                    context,
                    l10n.meshNode,
                    DeviceIdentity.shortDeviceId,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.oneDeviceNote,
                    style: text.bodySmall?.copyWith(
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          // ── Shift ──
          _sectionLabel(context, l10n.shift),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: <Widget>[
                  _infoRow(
                    context,
                    l10n.hoursOnTask,
                    _hoursOnTask.toStringAsFixed(1),
                  ),
                  _infoRow(context, l10n.lastCheckIn, _lastCheckIn),
                  _infoRow(context, l10n.nextCheckIn, _nextCheckIn),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          // ── Session ──
          _sectionLabel(context, l10n.session),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: <Widget>[
                  Icon(
                    tokenRemaining.isNegative
                        ? Icons.lock_outline
                        : Icons.lock_open,
                    color: tokenRemaining.isNegative
                        ? AppColors.p0
                        : AppColors.p3,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      l10n.offlineCredentials(tokenHours, tokenMinutes),
                      style: text.bodyMedium,
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          // ── Language ──
          _sectionLabel(context, l10n.language),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: _languageLabels.entries.map((entry) {
                  final bool selected =
                      localeCtrl.locale.languageCode == entry.key;
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(
                      selected
                          ? Icons.radio_button_checked
                          : Icons.radio_button_unchecked,
                      color: selected
                          ? AppColors.accent
                          : AppColors.textSecondary,
                    ),
                    title: Text(entry.value),
                    trailing: selected
                        ? const Icon(Icons.check, color: AppColors.accent)
                        : null,
                    onTap: () => localeCtrl.setLocale(Locale(entry.key)),
                  );
                }).toList(),
              ),
            ),
          ),

          const SizedBox(height: 24),

          // ── Log out ──
          OutlinedButton.icon(
            onPressed: () {
              // TODO(backend): clear session token, navigate to login.
              ScaffoldMessenger.of(context)
                ..hideCurrentSnackBar()
                ..showSnackBar(
                  SnackBar(content: Text(l10n.logOut)),
                );
            },
            icon: const Icon(Icons.logout, color: AppColors.p0),
            label: Text(
              l10n.logOut,
              style: const TextStyle(color: AppColors.p0),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionLabel(BuildContext context, String label) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          label.toUpperCase(),
          style: Theme.of(context)
              .textTheme
              .bodySmall
              ?.copyWith(letterSpacing: 1.2),
        ),
      );

  Widget _infoRow(BuildContext context, String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: <Widget>[
            Expanded(
              flex: 2,
              child: Text(
                label,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
            Expanded(
              flex: 3,
              child: Text(value, style: Theme.of(context).textTheme.bodyMedium),
            ),
          ],
        ),
      );
}
