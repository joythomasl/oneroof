import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../mesh/report_store.dart';
import '../../theme/app_theme.dart';
import 'reports_screen.dart';

/// Full-screen detail view for a field report, pushed via Navigator.
///
/// Sections top to bottom: header, title + type, photo/evidence chain,
/// location, description, timeline, CPOC rejection block, sync state.
class ReportDetailScreen extends StatelessWidget {
  const ReportDetailScreen({super.key, required this.report});
  final FieldReport report;

  @override
  Widget build(BuildContext context) {
    final AppLocalizations l10n = AppLocalizations.of(context)!;
    final TextTheme text = Theme.of(context).textTheme;
    final int queuePosition =
        reportStore.unsynced.indexWhere((m) => m.id == report.id) + 1;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.reportDetail)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: <Widget>[
          // ── Header ──
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: <Widget>[
              StatusBadge.severity(report.severity),
              StatusBadge.reportStatus(report.status),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: <Widget>[
              Text(report.id, style: text.bodySmall),
              const Spacer(),
              Text(
                l10n.timeFiled(report.filedAgo),
                style: text.bodySmall,
              ),
            ],
          ),

          const SizedBox(height: 20),

          // ── Title + Type ──
          _sectionLabel(context, l10n.type),
          Card(
            child: ListTile(
              leading: Icon(
                report.icon,
                color: AppColors.severity(report.severity),
                size: 30,
              ),
              title: Text(report.title),
              subtitle: Text(report.incidentType),
            ),
          ),

          const SizedBox(height: 20),

          // ── Photo / Evidence chain ──
          if (report.thumbnailBase64 != null) ...<Widget>[
            _sectionLabel(context, l10n.photo),
            _PhotoEvidence(report: report),
            const SizedBox(height: 20),
          ],

          // ── Location ──
          _sectionLabel(context, l10n.location),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      const Icon(
                        Icons.place_outlined,
                        size: 20,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(report.location, style: text.bodyMedium),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _detailRow(
                    context,
                    Icons.gps_fixed,
                    '${report.latitude.toStringAsFixed(6)}, '
                        '${report.longitude.toStringAsFixed(6)}',
                  ),
                  _detailRow(
                    context,
                    Icons.adjust,
                    '${l10n.accuracy}: '
                        '±${report.accuracyMetres.toStringAsFixed(0)} m',
                  ),
                  _detailRow(
                    context,
                    Icons.straighten,
                    '${l10n.distanceFromYou}: '
                        '${report.distanceFromResponderKm.toStringAsFixed(1)} km',
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          // ── Description ──
          _sectionLabel(context, l10n.description),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    report.description.isNotEmpty
                        ? report.description
                        : '—',
                    style: text.bodyMedium,
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: <Widget>[
                      const Icon(
                        Icons.translate,
                        size: 16,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '${l10n.language}: ${report.language}',
                        style: text.bodySmall,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          // ── Timeline ──
          _sectionLabel(context, l10n.timeline),
          _TimelineCard(timeline: report.timeline),

          // ── CPOC Rejection Block ──
          if (report.status.toUpperCase() == 'REOPENED') ...<Widget>[
            const SizedBox(height: 20),
            _RejectionBlock(report: report),
          ],

          const SizedBox(height: 20),

          // ── Sync State ──
          _sectionLabel(context, l10n.syncState),
          Card(
            child: ListTile(
              leading: Icon(
                report.synced ? Icons.cloud_done : Icons.cloud_queue,
                color: report.synced ? AppColors.p3 : AppColors.p1,
              ),
              title: Text(
                report.synced
                    ? l10n.reachedServer
                    : l10n.queuedForSync(
                        queuePosition <= 0 ? 1 : queuePosition,
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionLabel(BuildContext context, String value) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          value.toUpperCase(),
          style: Theme.of(context)
              .textTheme
              .bodySmall
              ?.copyWith(letterSpacing: 1.2),
        ),
      );

  Widget _detailRow(BuildContext context, IconData icon, String text) =>
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          children: <Widget>[
            Icon(icon, size: 16, color: AppColors.textSecondary),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                text,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ],
        ),
      );
}

// ─── Photo / evidence chain ────────────────────────────────────────────────

class _PhotoEvidence extends StatelessWidget {
  const _PhotoEvidence({required this.report});
  final FieldReport report;

  @override
  Widget build(BuildContext context) {
    final AppLocalizations l10n = AppLocalizations.of(context)!;
    final TextTheme text = Theme.of(context).textTheme;
    final Uint8List? bytes = _decode(report.thumbnailBase64);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            // Thumbnail — tap for full-screen pinch zoom
            if (bytes != null)
              InkWell(
                onTap: () => Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(
                    builder: (_) => _ImageViewer(bytes: bytes),
                  ),
                ),
                borderRadius: BorderRadius.circular(8),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.memory(
                    bytes,
                    width: double.infinity,
                    height: 190,
                    fit: BoxFit.cover,
                  ),
                ),
              ),

            // Syncing progress indicator
            const SizedBox(height: 10),
            Row(
              children: <Widget>[
                const SizedBox.square(
                  dimension: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                const SizedBox(width: 8),
                Text(l10n.fullImageSyncing(35), style: text.bodySmall),
              ],
            ),

            // Evidence chain metadata
            const Divider(height: 24),
            Text(
              l10n.evidenceChain.toUpperCase(),
              style: text.bodySmall?.copyWith(letterSpacing: 1.0),
            ),
            const SizedBox(height: 8),
            _metaRow(context, l10n.captured, report.captureTime),
            _metaRow(
              context,
              l10n.location,
              '${report.latitude.toStringAsFixed(6)}, '
                  '${report.longitude.toStringAsFixed(6)}',
            ),
            _metaRow(
              context,
              l10n.accuracy,
              '±${report.accuracyMetres.toStringAsFixed(0)} m',
            ),
            _metaRow(
              context,
              'SHA-256',
              '${report.photoSha256?.substring(0, 12) ?? '—'}…',
            ),
          ],
        ),
      ),
    );
  }

  Widget _metaRow(BuildContext context, String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          children: <Widget>[
            SizedBox(
              width: 80,
              child: Text(
                label,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
            Expanded(
              child: Text(value, style: Theme.of(context).textTheme.bodySmall),
            ),
          ],
        ),
      );

  static Uint8List? _decode(String? base64String) {
    try {
      return base64String == null ? null : base64Decode(base64String);
    } catch (_) {
      return null;
    }
  }
}

// ─── Full-screen image viewer ──────────────────────────────────────────────

class _ImageViewer extends StatelessWidget {
  const _ImageViewer({required this.bytes});
  final Uint8List bytes;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(backgroundColor: Colors.black),
      body: Center(
        child: InteractiveViewer(child: Image.memory(bytes)),
      ),
    );
  }
}

// ─── Timeline card ─────────────────────────────────────────────────────────

class _TimelineCard extends StatelessWidget {
  const _TimelineCard({required this.timeline});
  final List<ReportEvent> timeline;

  @override
  Widget build(BuildContext context) {
    final AppLocalizations l10n = AppLocalizations.of(context)!;
    final TextTheme text = Theme.of(context).textTheme;

    if (timeline.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text('—', style: text.bodySmall),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          children: timeline.asMap().entries.map((entry) {
            final int index = entry.key;
            final bool isLast = index == timeline.length - 1;
            final ReportEvent event = entry.value;

            return IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  // Timeline bar
                  SizedBox(
                    width: 48,
                    child: Column(
                      children: <Widget>[
                        const SizedBox(height: 16),
                        Icon(
                          Icons.circle,
                          size: 12,
                          color: AppColors.info,
                        ),
                        if (!isLast)
                          Expanded(
                            child: Container(
                              width: 1,
                              color: AppColors.border,
                            ),
                          ),
                      ],
                    ),
                  ),
                  // Content
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(0, 12, 16, 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            event.label,
                            style: text.titleMedium,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${event.actor} · ${event.role}',
                            style: text.bodySmall,
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: <Widget>[
                              Text(event.timestamp, style: text.bodySmall),
                              if (event.syncedLateMinutes != null) ...<Widget>[
                                const SizedBox(width: 8),
                                Text(
                                  '· ${l10n.syncedLateMinutes(event.syncedLateMinutes!)}',
                                  style: text.bodySmall?.copyWith(
                                    color: AppColors.p1,
                                    fontStyle: FontStyle.italic,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

// ─── CPOC Rejection block ──────────────────────────────────────────────────

class _RejectionBlock extends StatelessWidget {
  const _RejectionBlock({required this.report});
  final FieldReport report;

  @override
  Widget build(BuildContext context) {
    final AppLocalizations l10n = AppLocalizations.of(context)!;
    final TextTheme text = Theme.of(context).textTheme;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.p0.withValues(alpha: 0.10),
        border: Border.all(color: AppColors.p0, width: 2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(Icons.error_outline, color: AppColors.p0, size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  l10n.rejectionReason,
                  style: text.titleMedium?.copyWith(color: AppColors.p0),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            report.rejectionReason ??
                'Evidence needs a clearer photo.',
            style: text.bodyMedium,
          ),
          const SizedBox(height: 8),
          Text(
            l10n.rejectedBy('CPOC Admin', report.captureTime),
            style: text.bodySmall,
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => Navigator.of(context).pop(),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.p0),
              foregroundColor: AppColors.p0,
            ),
            icon: const Icon(Icons.camera_alt_outlined),
            label: Text(l10n.reAttend),
          ),
        ],
      ),
    );
  }
}
