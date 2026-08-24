import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

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
  ),
  FieldReport(
    id: 'RPT-4468',
    title: 'LPG leak reported near relief camp',
    location: 'Sector 4 Camp, Gate 2',
    severity: 'P1',
    status: 'Pending Verification',
    filedAgo: '22 min ago',
    agency: 'Fire & Rescue',
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
    final TextTheme text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Reports'),
        actions: <Widget>[
          IconButton(
            iconSize: 28,
            tooltip: 'Filter',
            icon: const Icon(Icons.filter_list),
            // TODO(backend): filter by severity, status and agency once the
            // list comes from the API rather than a const list.
            onPressed: () {
              ScaffoldMessenger.of(context)
                ..hideCurrentSnackBar()
                ..showSnackBar(
                  const SnackBar(content: Text('Filters not wired yet')),
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
                '${_sampleReports.length} REPORTS — SECTOR 4',
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
              const SnackBar(content: Text('Report composer not built yet')),
            );
        },
        icon: const Icon(Icons.add),
        label: const Text('New report'),
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
        // TODO(backend): open the report detail screen (timeline, attachments,
        // verification actions).
        onTap: () {
          ScaffoldMessenger.of(context)
            ..hideCurrentSnackBar()
            ..showSnackBar(
              SnackBar(content: Text('${report.id} — detail view not built')),
            );
        },
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
