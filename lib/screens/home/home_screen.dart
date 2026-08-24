import 'dart:async';

import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

/// Duty status the responder reports to the coordination centre.
///
/// The order of these values is the order the "change status" button cycles
/// through, so keep them in the order a shift actually runs.
enum DutyStatus {
  available('Available', Icons.check_circle_outline, AppColors.p3),
  enRoute('En Route', Icons.directions_run, AppColors.info),
  engaged('Engaged', Icons.local_fire_department_outlined, AppColors.p1),
  resting('Resting', Icons.bedtime_outlined, AppColors.p2),
  offDuty('Off Duty', Icons.do_not_disturb_on_outlined, AppColors.textSecondary);

  const DutyStatus(this.label, this.icon, this.color);

  final String label;
  final IconData icon;
  final Color color;

  /// Next status in the cycle, wrapping back to [available] at the end.
  DutyStatus get next => DutyStatus.values[(index + 1) % DutyStatus.values.length];
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
  late final DateTime _declaredAt =
      DateTime.now().subtract(const Duration(hours: 6, minutes: 42));

  DutyStatus _status = DutyStatus.available;
  Timer? _ticker;
  Duration _elapsed = Duration.zero;

  @override
  void initState() {
    super.initState();
    _elapsed = DateTime.now().difference(_declaredAt);
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _elapsed = DateTime.now().difference(_declaredAt));
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  void _cycleStatus() {
    setState(() => _status = _status.next);
    // TODO(backend): POST the new duty status so the coordination centre sees
    // it. When offline this should queue and also broadcast over the mesh.
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text('Status set to ${_status.label}')),
      );
  }

  static String _formatElapsed(Duration d) {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(d.inHours)}:${two(d.inMinutes % 60)}:${two(d.inSeconds % 60)}';
  }

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Samanvay Responder'),
        actions: <Widget>[
          IconButton(
            iconSize: 28,
            tooltip: 'Account',
            icon: const Icon(Icons.account_circle_outlined),
            // TODO(nav): jump to the Profile tab instead of a snackbar once
            // RootNav exposes a tab controller.
            onPressed: () {
              ScaffoldMessenger.of(context)
                ..hideCurrentSnackBar()
                ..showSnackBar(
                  const SnackBar(content: Text('Open the Profile tab')),
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
            elapsed: _formatElapsed(_elapsed),
          ),
          const SizedBox(height: 16),
          _DutyStatusCard(status: _status, onCycle: _cycleStatus),
          const SizedBox(height: 16),
          Text('QUICK ACTIONS',
              style: text.bodySmall?.copyWith(letterSpacing: 1.2)),
          const SizedBox(height: 8),
          // TODO(backend): wire these to the report-submission and SOS
          // endpoints. Both must fall back to the mesh when there is no uplink.
          const _QuickAction(
            icon: Icons.add_alert_outlined,
            label: 'File new report',
            subtitle: 'Casualty, hazard, resource request',
          ),
          const SizedBox(height: 8),
          const _QuickAction(
            icon: Icons.sos_outlined,
            label: 'Responder SOS',
            subtitle: 'Broadcast own-safety alert to all units',
            tint: AppColors.p0,
          ),
        ],
      ),
    );
  }
}

class _AreaStateCard extends StatelessWidget {
  const _AreaStateCard({
    required this.areaState,
    required this.areaName,
    required this.incidentCode,
    required this.elapsed,
  });

  final String areaState;
  final String areaName;
  final String incidentCode;
  final String elapsed;

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
                StatusBadge.areaState(areaState, icon: Icons.warning_amber_rounded),
                const Spacer(),
                Text(incidentCode, style: text.bodySmall),
              ],
            ),
            const SizedBox(height: 14),
            Text(areaName, style: text.titleLarge),
            const SizedBox(height: 14),
            const Divider(),
            const SizedBox(height: 14),
            Row(
              children: <Widget>[
                const Icon(Icons.timer_outlined,
                    size: 20, color: AppColors.textSecondary),
                const SizedBox(width: 10),
                Text('Elapsed', style: text.bodyMedium),
                const Spacer(),
                Text(
                  elapsed,
                  style: text.titleLarge?.copyWith(
                    fontFeatures: const <FontFeature>[
                      FontFeature.tabularFigures(),
                    ],
                    color: AppColors.areaState(areaState),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text('since emergency declared', style: text.bodySmall),
          ],
        ),
      ),
    );
  }
}

class _DutyStatusCard extends StatelessWidget {
  const _DutyStatusCard({required this.status, required this.onCycle});

  final DutyStatus status;
  final VoidCallback onCycle;

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text('YOUR STATUS',
                style: text.bodySmall?.copyWith(letterSpacing: 1.2)),
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
                      Text(status.label, style: text.headlineSmall),
                      const SizedBox(height: 2),
                      Text('Tap below to change', style: text.bodySmall),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: onCycle,
              icon: const Icon(Icons.sync_alt),
              label: Text('Change to ${status.next.label}'),
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
    this.tint,
  });

  final IconData icon;
  final String label;
  final String subtitle;
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    final Color color = tint ?? AppColors.textPrimary;
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Icon(icon, size: 30, color: color),
        title: Text(
          label,
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(color: color),
        ),
        subtitle: Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {
          ScaffoldMessenger.of(context)
            ..hideCurrentSnackBar()
            ..showSnackBar(SnackBar(content: Text('$label — not wired yet')));
        },
      ),
    );
  }
}
