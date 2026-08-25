import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../../l10n/app_localizations.dart';
import '../../mesh/device_identity.dart';
import '../../mesh/mesh_message.dart';
import '../../mesh/report_store.dart';
import '../../theme/app_theme.dart';
import '../../widgets/emergency_clock.dart';
import '../create_request/create_request_screen.dart';

/// Duty status the responder reports to the coordination centre.
///
/// The order of these values is the order shown in the bottom-sheet selector.
enum DutyStatus {
  available('Available', Icons.check_circle_outline, AppColors.p3),
  enRoute('En Route', Icons.directions_run, AppColors.info),
  engaged('Engaged', Icons.local_fire_department_outlined, AppColors.p1),
  resting('Resting', Icons.bedtime_outlined, AppColors.p2),
  offDuty(
    'Off Duty',
    Icons.do_not_disturb_on_outlined,
    AppColors.textSecondary,
  );

  const DutyStatus(this.label, this.icon, this.color);

  final String label;
  final IconData icon;
  final Color color;

  /// Next status in the cycle, wrapping back to [available] at the end.
  DutyStatus get next =>
      DutyStatus.values[(index + 1) % DutyStatus.values.length];

  /// Localized display label.
  String localizedLabel(AppLocalizations l10n) {
    switch (this) {
      case DutyStatus.available:
        return l10n.available;
      case DutyStatus.enRoute:
        return l10n.enRoute;
      case DutyStatus.engaged:
        return l10n.engaged;
      case DutyStatus.resting:
        return l10n.resting;
      case DutyStatus.offDuty:
        return l10n.offDuty;
    }
  }

  /// One-line description shown in the selector.
  String localizedDescription(AppLocalizations l10n) {
    switch (this) {
      case DutyStatus.available:
        return l10n.readyForTasking;
      case DutyStatus.enRoute:
        return l10n.travellingToIncident;
      case DutyStatus.engaged:
        return l10n.activelyWorking;
      case DutyStatus.resting:
        return l10n.mandatoryRest;
      case DutyStatus.offDuty:
        return l10n.shiftEnded;
    }
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // TODO(backend): all four of these come from the incident/session API.
  // Replace with a fetched incident object + the signed-in responder record.
  static const String _areaState = 'EMERGENCY';
  static const String _areaName = 'Sector 4 — Riverfront';
  static const String _incidentCode = 'INC-2291';

  /// When the current emergency was declared. Hardcoded to "a few hours ago"
  /// so the elapsed timer shows something meaningful during testing.
  late final DateTime _declaredAt = DateTime.now().subtract(
    const Duration(hours: 6, minutes: 42),
  );

  DutyStatus _status = DutyStatus.available;

  void _openStatusSelector() {
    final AppLocalizations l10n = AppLocalizations.of(context)!;

    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (BuildContext sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Text(
                      l10n.selectDutyStatus,
                      style: Theme.of(sheetContext).textTheme.titleMedium,
                    ),
                  ),
                  const Divider(height: 1),
                  ...DutyStatus.values.map((DutyStatus s) {
                    final bool isCurrent = s == _status;
                    return ListTile(
                      leading: Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: s.color,
                          shape: BoxShape.circle,
                        ),
                      ),
                      title: Text(s.localizedLabel(l10n)),
                      subtitle: Text(
                        s.localizedDescription(l10n),
                        style: Theme.of(sheetContext).textTheme.bodySmall,
                      ),
                      trailing: isCurrent
                          ? const Icon(Icons.check, color: AppColors.accent)
                          : null,
                      onTap: () {
                        Navigator.of(sheetContext).pop();
                        _selectStatus(s);
                      },
                    );
                  }),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _selectStatus(DutyStatus newStatus) async {
    final AppLocalizations l10n = AppLocalizations.of(context)!;

    // ENGAGED prompts for a linked incident ID.
    if (newStatus == DutyStatus.engaged) {
      final String? incidentId = await _promptText(
        title: l10n.linkedIncident,
        hintText: 'INC-',
      );
      if (!mounted) return;
      if (incidentId == null) return; // cancelled
      _commitStatus(newStatus, extra: <String, dynamic>{
        'linkedIncident': incidentId,
      });
      return;
    }

    // RESTING prompts for a rest duration.
    if (newStatus == DutyStatus.resting) {
      final String? minutes = await _promptText(
        title: l10n.restDuration,
        hintText: '30',
        keyboardType: TextInputType.number,
      );
      if (!mounted) return;
      if (minutes == null) return; // cancelled
      _commitStatus(newStatus, extra: <String, dynamic>{
        'restMinutes': int.tryParse(minutes) ?? 30,
      });
      return;
    }

    _commitStatus(newStatus);
  }

  void _commitStatus(
    DutyStatus newStatus, {
    Map<String, dynamic> extra = const <String, dynamic>{},
  }) {
    final AppLocalizations l10n = AppLocalizations.of(context)!;
    setState(() => _status = newStatus);

    final MeshMessage msg = MeshMessage.create(
      type: MeshMessageType.statusUpdate.wireName,
      originDevice: DeviceIdentity.deviceId,
      originUser: DeviceIdentity.userId,
      priority: MeshPriority.statusOrLocation,
      payload: <String, dynamic>{
        'dutyStatus': newStatus.name, // wire enum value, never translated
        ...extra,
      },
    );
    reportStore.add(msg);

    final String label = newStatus.localizedLabel(l10n);
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text(l10n.statusQueued(label))),
      );
  }

  Future<String?> _promptText({
    required String title,
    String? hintText,
    TextInputType keyboardType = TextInputType.text,
  }) {
    final AppLocalizations l10n = AppLocalizations.of(context)!;
    final TextEditingController controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (BuildContext ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text(title),
        content: TextField(
          controller: controller,
          keyboardType: keyboardType,
          autofocus: true,
          decoration: InputDecoration(hintText: hintText),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(l10n.cancel),
          ),
          TextButton(
            onPressed: () =>
                Navigator.of(ctx).pop(controller.text.trim()),
            child: Text(l10n.continueLabel),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final AppLocalizations l10n = AppLocalizations.of(context)!;
    final TextTheme text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.appTitle),
        actions: <Widget>[
          IconButton(
            iconSize: 28,
            tooltip: l10n.account,
            icon: const Icon(Icons.account_circle_outlined),
            // TODO(nav): jump to the Profile tab instead of a snackbar once
            // RootNav exposes a tab controller.
            onPressed: () {
              ScaffoldMessenger.of(context)
                ..hideCurrentSnackBar()
                ..showSnackBar(
                  SnackBar(content: Text(l10n.openProfileTab)),
                );
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: <Widget>[
          _AreaStateCard(
            areaState: _areaState,
            areaName: _areaName,
            incidentCode: _incidentCode,
          ),
          const SizedBox(height: 12),
          EmergencyClock(stateEnteredAt: _declaredAt),
          const SizedBox(height: 16),
          _DutyStatusCard(
            status: _status,
            onTap: _openStatusSelector,
          ),
          const SizedBox(height: 16),
          Text(
            l10n.quickActions.toUpperCase(),
            style: text.bodySmall?.copyWith(letterSpacing: 1.2),
          ),
          const SizedBox(height: 8),
          _QuickAction(
            icon: Icons.add_alert_outlined,
            label: l10n.fileNewReport,
            subtitle: l10n.casualtyHazardResource,
            onTap: _openCreateRequest,
          ),
          const SizedBox(height: 8),
          Text(
            l10n.quickReportP0.toUpperCase(),
            style: text.bodySmall?.copyWith(letterSpacing: 1.2),
          ),
          const SizedBox(height: 8),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 2.6,
            children: <Widget>[
              _quickReportButton(
                'trapped',
                l10n.trapped,
                Icons.person_pin_circle_outlined,
              ),
              _quickReportButton(
                'fire',
                l10n.fire,
                Icons.local_fire_department_outlined,
              ),
              _quickReportButton(
                'flooding',
                l10n.flood,
                Icons.water_outlined,
              ),
              _quickReportButton(
                'medical',
                l10n.medical,
                Icons.medical_services_outlined,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _openCreateRequest() async {
    final AppLocalizations l10n = AppLocalizations.of(context)!;
    final CreateRequestResult? result = await Navigator.of(context)
        .push<CreateRequestResult>(
          MaterialPageRoute<CreateRequestResult>(
            builder: (_) => CreateRequestScreen(areaState: _areaState),
          ),
        );
    if (!mounted || result == null) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            l10n.reportQueuedGeneric(
              DeviceIdentity.shorten(result.reportId),
            ),
          ),
        ),
      );
  }

  Widget _quickReportButton(String type, String label, IconData icon) =>
      OutlinedButton.icon(
        icon: Icon(icon, color: AppColors.p0),
        label: Text(label),
        onPressed: () => _fileQuickReport(type, label),
      );

  Future<void> _fileQuickReport(String incidentType, String label) async {
    final AppLocalizations l10n = AppLocalizations.of(context)!;
    Position? position;
    try {
      if (await Geolocator.isLocationServiceEnabled()) {
        LocationPermission permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.denied) {
          permission = await Geolocator.requestPermission();
        }
        if (permission != LocationPermission.denied &&
            permission != LocationPermission.deniedForever) {
          position = await Geolocator.getCurrentPosition(
            locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.high,
            ),
          );
        }
      }
    } catch (_) {
      // A P0 must be able to leave the device even when GPS is unavailable.
    }
    if (!mounted) return;
    final MeshMessage report = MeshMessage.create(
      type: MeshMessageType.incidentReport.wireName,
      originDevice: DeviceIdentity.deviceId,
      originUser: DeviceIdentity.userId,
      priority: 0,
      payload: <String, dynamic>{
        'incidentType': incidentType,
        'severity': 'P0',
        'description': '',
        'language': 'English',
        'lat': position?.latitude,
        'lng': position?.longitude,
        'gpsAccuracy': position?.accuracy,
        'capturedAt': DateTime.now().toUtc().toIso8601String(),
        'photoSha256': null,
        'photoFilename': null,
        'photoSizeBytes': null,
        'thumbnailBase64': null,
      },
    );
    reportStore.add(report);
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            l10n.reportQueuedForSync(
              label,
              DeviceIdentity.shorten(report.id),
            ),
          ),
        ),
      );
  }
}

class _AreaStateCard extends StatelessWidget {
  const _AreaStateCard({
    required this.areaState,
    required this.areaName,
    required this.incidentCode,
  });

  final String areaState;
  final String areaName;
  final String incidentCode;

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                StatusBadge.areaState(
                  areaState,
                  icon: Icons.warning_amber_rounded,
                ),
                const Spacer(),
                Text(incidentCode, style: text.bodySmall),
              ],
            ),
            const SizedBox(height: 14),
            Text(areaName, style: text.titleLarge),
          ],
        ),
      ),
    );
  }
}

class _DutyStatusCard extends StatelessWidget {
  const _DutyStatusCard({required this.status, required this.onTap});

  final DutyStatus status;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final AppLocalizations l10n = AppLocalizations.of(context)!;
    final TextTheme text = Theme.of(context).textTheme;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              l10n.yourStatus.toUpperCase(),
              style: text.bodySmall?.copyWith(letterSpacing: 1.2),
            ),
            const SizedBox(height: 12),
            Row(
              children: <Widget>[
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: status.color.withValues(alpha: 0.16),
                    border: Border.all(color: status.color, width: 1.5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(status.icon, color: status.color, size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        status.localizedLabel(l10n),
                        style: text.headlineSmall,
                      ),
                      const SizedBox(height: 2),
                      Text(l10n.tapToChange, style: text.bodySmall),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: onTap,
              icon: const Icon(Icons.swap_vert),
              label: Text(l10n.changeStatus),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    const Color color = AppColors.textPrimary;
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Icon(icon, size: 30, color: color),
        title: Text(
          label,
          style: Theme.of(context).textTheme.titleMedium
              ?.copyWith(color: color),
        ),
        subtitle: Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
