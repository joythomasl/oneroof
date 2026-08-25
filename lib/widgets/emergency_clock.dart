import 'dart:async';

import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';

/// Compact response-phase clock, supplied with an area-state entry time.
///
/// Shows two counters in one card:
///   • Elapsed (counting up) — time since [stateEnteredAt]
///   • Countdown (counting down) — time remaining to the 24-hour mark
///
/// Colour shifts: green under 6 h, amber 6–20 h, red past 20 h.
/// When the countdown crosses zero, the label reads "recovery phase due"
/// rather than showing a negative number.
class EmergencyClock extends StatefulWidget {
  const EmergencyClock({super.key, required this.stateEnteredAt, this.now});

  /// When the area entered its current state.
  final DateTime stateEnteredAt;

  /// Injectable clock for testing. Defaults to [DateTime.now].
  final DateTime Function()? now;

  /// Formats a duration as HH:MM:SS with zero-padded components.
  static String formatDuration(Duration d) {
    String two(int value) => value.toString().padLeft(2, '0');
    return '${two(d.inHours)}:${two(d.inMinutes % 60)}:${two(d.inSeconds % 60)}';
  }

  /// Whether the 24-hour deadline has passed.
  static bool recoveryDue(DateTime enteredAt, DateTime now) =>
      !now.isBefore(enteredAt.add(const Duration(hours: 24)));

  /// Colour for the elapsed duration.
  static Color elapsedColor(Duration elapsed) {
    if (elapsed < const Duration(hours: 6)) return AppColors.p3;
    if (elapsed < const Duration(hours: 20)) return AppColors.p2;
    return AppColors.p0;
  }

  @override
  State<EmergencyClock> createState() => _EmergencyClockState();
}

class _EmergencyClockState extends State<EmergencyClock> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final AppLocalizations l10n = AppLocalizations.of(context)!;
    final TextTheme text = Theme.of(context).textTheme;
    final DateTime now = (widget.now ?? DateTime.now)();
    final Duration elapsed = now.difference(widget.stateEnteredAt);
    final bool due = EmergencyClock.recoveryDue(widget.stateEnteredAt, now);
    final Duration remaining = due
        ? Duration.zero
        : widget.stateEnteredAt
            .add(const Duration(hours: 24))
            .difference(now);
    final Color color = EmergencyClock.elapsedColor(elapsed);

    const List<FontFeature> tabular = <FontFeature>[
      FontFeature.tabularFigures(),
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: <Widget>[
            // ── Elapsed (counting up) ──
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Icon(Icons.timer_outlined, size: 18, color: color),
                      const SizedBox(width: 6),
                      Text(
                        l10n.elapsed.toUpperCase(),
                        style: text.bodySmall?.copyWith(letterSpacing: 1.0),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    EmergencyClock.formatDuration(elapsed),
                    style: text.titleLarge?.copyWith(
                      color: color,
                      fontFeatures: tabular,
                    ),
                  ),
                ],
              ),
            ),

            // ── Vertical divider ──
            Container(
              width: 1,
              height: 48,
              color: AppColors.border,
              margin: const EdgeInsets.symmetric(horizontal: 12),
            ),

            // ── Countdown (counting down) ──
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Icon(
                        Icons.hourglass_bottom,
                        size: 18,
                        color: due ? AppColors.p0 : AppColors.textSecondary,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        l10n.countdown.toUpperCase(),
                        style: text.bodySmall?.copyWith(letterSpacing: 1.0),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  if (due)
                    Text(
                      l10n.recoveryPhaseDue,
                      style: text.bodyMedium?.copyWith(
                        color: AppColors.p0,
                        fontWeight: FontWeight.w700,
                      ),
                    )
                  else
                    Text(
                      l10n.toRecoveryPhase(
                        remaining.inHours,
                        remaining.inMinutes % 60,
                      ),
                      style: text.bodyMedium?.copyWith(
                        color: AppColors.textPrimary,
                        fontFeatures: tabular,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
