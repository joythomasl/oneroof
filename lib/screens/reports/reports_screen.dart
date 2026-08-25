import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import 'report_detail_screen.dart';

/// One field report submitted by a responder.
// TODO(backend): replace with the API model + a local queue, so reports filed
// while offline are held and flushed when connectivity (or the mesh) returns.
class FieldReport {
  const FieldReport({
    required this.id,
    required this.title,
    required this.location,
    required this.severity,
    required this.status,
    required this.filedAgo,
    required this.agency,
    this.incidentType = 'Incident report',
    this.icon = Icons.warning_amber_outlined,
    this.description = 'Field responder report awaiting coordination review.',
    this.language = 'English',
    this.latitude = 9.9312,
    this.longitude = 76.2673,
    this.accuracyMetres = 12,
    this.distanceFromResponderKm = 1.4,
    this.captureTime = 'Today, 10:24',
    this.thumbnailBase64,
    this.photoSha256,
    this.synced = false,
    this.timeline = const <ReportEvent>[],
    this.rejectionReason,
  });

  final String id;
  final String title;
  final String location;

  /// `P0`..`P3`.
  final String severity;

  /// `Pending Verification`, `Verified`, `In Progress`, `Closed`, `Reopened`.
  final String status;
  final String filedAgo;
  final String agency;
  final String incidentType;
  final IconData icon;
  final String description;
  final String language;
  final double latitude;
  final double longitude;
  final double accuracyMetres;
  final double distanceFromResponderKm;
  final String captureTime;
  final String? thumbnailBase64;
  final String? photoSha256;
  final bool synced;
  final List<ReportEvent> timeline;
  final String? rejectionReason;
}

class ReportEvent {
  const ReportEvent(this.label, this.actor, this.role, this.timestamp, {this.syncedLateMinutes});
  final String label;
  final String actor;
  final String role;
  final String timestamp;
  final int? syncedLateMinutes;
}

/// Hardcoded sample data for layout work.
const List<FieldReport> _sampleReports = <FieldReport>[
  FieldReport(
    id: 'RPT-4471',
    title: 'Structural collapse, 3 trapped',
    location: 'Riverfront Rd, Block C',
    severity: 'P0',
    status: 'In Progress',
    filedAgo: '4 min ago',
    agency: 'NDRF',
    incidentType: 'collapse',
    icon: Icons.domain_outlined,
    timeline: <ReportEvent>[ReportEvent('Reported', 'S. Ramesh', 'Responder', '10:24'), ReportEvent('Triaged', 'Anita Joseph', 'CPOC', '10:27', syncedLateMinutes: 2)],
  ),
  FieldReport(
    id: 'RPT-4468',
    title: 'LPG leak reported near relief camp',
    location: 'Sector 4 Camp, Gate 2',
    severity: 'P1',
    status: 'Pending Verification',
    filedAgo: '22 min ago',
    agency: 'Fire & Rescue',
    incidentType: 'gas_leak',
    icon: Icons.propane_tank_outlined,
  ),
  FieldReport(
    id: 'RPT-4462',
    title: 'Drinking water shortage, 200+ people',
    location: 'Community Hall, Sector 7',
    severity: 'P2',
    status: 'Pending Verification',
    filedAgo: '1 hr ago',
    agency: 'Revenue Dept',
  ),
  FieldReport(
    id: 'RPT-4455',
    title: 'Road blocked by fallen trees',
    location: 'Link Rd between Sector 4 and 5',
    severity: 'P2',
    status: 'Reopened',
    filedAgo: '2 hr ago',
    agency: 'PWD',
    incidentType: 'road_blocked',
    icon: Icons.block_outlined,
    rejectionReason: 'Location and image do not show the reported fallen trees. Re-attend with a clear photo.',
  ),
  FieldReport(
    id: 'RPT-4440',
    title: 'Medical evacuation completed',
    location: 'Riverfront Jetty',
    severity: 'P1',
    status: 'Closed',
    filedAgo: '5 hr ago',
    agency: 'Health Services',
  ),
  FieldReport(
    id: 'RPT-4431',
    title: 'Livestock shelter request',
    location: 'Village Kunnathur',
    severity: 'P3',
    status: 'Closed',
    filedAgo: '8 hr ago',
    agency: 'Animal Husbandry',
  ),
];

class ReportsScreen extends StatelessWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final AppLocalizations l10n = AppLocalizations.of(context)!;
    final TextTheme text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.reports),
        actions: <Widget>[
          IconButton(
            iconSize: 28,
            tooltip: l10n.filter,
            icon: const Icon(Icons.filter_list),
            // TODO(backend): filter by severity, status and agency once the
            // list comes from the API rather than a const list.
            onPressed: () {
              ScaffoldMessenger.of(context)
                ..hideCurrentSnackBar()
                ..showSnackBar(
                  SnackBar(content: Text(l10n.filtersNotWired)),
                );
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        itemCount: _sampleReports.length + 1,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (BuildContext context, int i) {
          if (i == 0) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(
                l10n.reportsCount(_sampleReports.length, 'SECTOR 4').toUpperCase(),
                style: text.bodySmall?.copyWith(letterSpacing: 1.2),
              ),
            );
          }
          return _ReportTile(report: _sampleReports[i - 1]);
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.white,
        // TODO(backend): open the report composer and POST to the reports API.
        onPressed: () {
          ScaffoldMessenger.of(context)
            ..hideCurrentSnackBar()
            ..showSnackBar(
              SnackBar(content: Text(l10n.reportComposerNotBuilt)),
            );
        },
        icon: const Icon(Icons.add),
        label: Text(l10n.newReport),
      ),
    );
  }
}

class _ReportTile extends StatelessWidget {
  const _ReportTile({required this.report});

  final FieldReport report;

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => Navigator.of(context).push<void>(MaterialPageRoute<void>(builder: (_) => ReportDetailScreen(report: report))),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              // Wrap rather than Row: "PENDING VERIFICATION" plus a severity
              // badge is wider than a narrow phone in one line.
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: <Widget>[
                  StatusBadge.severity(report.severity),
                  StatusBadge.reportStatus(report.status),
                ],
              ),
              const SizedBox(height: 12),
              Text(report.title, style: text.titleMedium),
              const SizedBox(height: 8),
              Row(
                children: <Widget>[
                  const Icon(Icons.place_outlined,
                      size: 18, color: AppColors.textSecondary),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      report.location,
                      style: text.bodySmall,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                children: <Widget>[
                  const Icon(Icons.apartment_outlined,
                      size: 18, color: AppColors.textSecondary),
                  const SizedBox(width: 6),
                  Text(report.agency, style: text.bodySmall),
                  const Spacer(),
                  Text('${report.id}  ·  ${report.filedAgo}',
                      style: text.bodySmall),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
