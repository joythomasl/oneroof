import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_p2p_connection/flutter_p2p_connection.dart';

import '../../mesh/bridge_mode.dart';
import '../../mesh/connection_manager.dart';
import '../../theme/app_theme.dart';

/// Bridge Mode: a relay node carrying messages between hosts that cannot see
/// each other.
///
/// The headline is [BridgeMode.relaysCompleted] and the measured per-hop
/// latency; everything else on the screen supports pointing at those two.
class BridgeScreen extends StatefulWidget {
  const BridgeScreen({
    super.key,
    required this.bridge,
    required this.connection,
    this.discovered = const <BleDiscoveredDevice>[],
  });

  final BridgeMode bridge;
  final ConnectionManager connection;

  /// Hosts the Mesh screen has already found. Selecting at least two of these
  /// is what makes a bridge.
  final List<BleDiscoveredDevice> discovered;

  @override
  State<BridgeScreen> createState() => _BridgeScreenState();
}

class _BridgeScreenState extends State<BridgeScreen> {
  // Defaults are the values that tested clean on hardware: 10/10 cycles,
  // 0 recoveries, 2.6s mean connect.
  final TextEditingController _scanSeconds = TextEditingController(text: '8');
  final TextEditingController _connectSeconds =
      TextEditingController(text: '20');
  final TextEditingController _syncSeconds = TextEditingController(text: '6');
  final TextEditingController _settleSeconds = TextEditingController(text: '5');

  final Set<String> _selected = <String>{};
  final List<BridgeEvent> _events = <BridgeEvent>[];
  StreamSubscription<BridgeEvent>? _sub;
  bool _running = false;

  @override
  void initState() {
    super.initState();
    // Pre-select everything found, since two is the common case and the
    // operator should be able to press Start immediately.
    for (final BleDiscoveredDevice d in widget.discovered) {
      _selected.add(d.deviceAddress);
    }
    _sub = widget.bridge.events.listen((BridgeEvent e) {
      if (!mounted) return;
      setState(() {
        _events.add(e);
        if (_events.length > 300) {
          _events.removeRange(0, _events.length - 300);
        }
      });
    });
    _running = widget.bridge.isRunning;
  }

  @override
  void dispose() {
    _sub?.cancel();
    // Leaving the screen stops the bridge and releases the radio. Safe to fire
    // and forget: BridgeMode never touches a BuildContext.
    unawaited(widget.bridge.stop());
    _scanSeconds.dispose();
    _connectSeconds.dispose();
    _syncSeconds.dispose();
    _settleSeconds.dispose();
    super.dispose();
  }

  Duration _seconds(TextEditingController c, int fallback) {
    final int? parsed = int.tryParse(c.text.trim());
    return Duration(
        seconds: (parsed == null || parsed <= 0) ? fallback : parsed);
  }

  List<BleDiscoveredDevice> get _chosen => <BleDiscoveredDevice>[
        for (final BleDiscoveredDevice d in widget.discovered)
          if (_selected.contains(d.deviceAddress)) d,
      ];

  Future<void> _start() async {
    if (_running) return;
    final List<BleDiscoveredDevice> targets = _chosen;
    if (targets.length < BridgeMode.minimumTargets) return;

    // Scan and connect timings are connection policy, so they go to the
    // manager. Only accepted while it is idle, hence before the run.
    widget.connection.tuning = widget.connection.tuning.copyWith(
      scanTimeout: _seconds(_scanSeconds, 8),
      connectTimeout: _seconds(_connectSeconds, 20),
    );

    setState(() => _running = true);
    await widget.bridge.start(targets: targets);
    if (!mounted) return;
    setState(() => _running = false);
  }

  Future<void> _stop() async {
    setState(() => _running = false);
    await widget.bridge.stop();
  }

  Future<void> _copyRelays() async {
    final BridgeMode b = widget.bridge;
    final StringBuffer out = StringBuffer()
      ..writeln('Bridge mode — ${b.relaysCompleted} relay(s) completed')
      ..writeln('${b.hopsCompleted}/${b.hopsAttempted} hops  ·  '
          '${b.perHopLabel}')
      ..writeln();
    for (final RelayRecord r in b.recentRelays) {
      out.writeln('${r.at.toIso8601String()}  ${r.messageType}  ${r.summary}');
    }
    await Clipboard.setData(ClipboardData(text: out.toString()));
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(const SnackBar(content: Text('Relay log copied')));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bridge mode'),
        actions: <Widget>[
          IconButton(
            iconSize: 26,
            tooltip: 'Copy relay log',
            icon: const Icon(Icons.copy_all),
            onPressed:
                widget.bridge.relaysCompleted == 0 ? null : _copyRelays,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: <Widget>[
            _buildStatusCard(),
            const Divider(height: 1),
            Expanded(child: _buildRelayLog()),
            const Divider(height: 1),
            _buildControls(),
          ],
        ),
      ),
    );
  }

  // --- top: status ---------------------------------------------------------

  Widget _buildStatusCard() {
    final TextTheme text = Theme.of(context).textTheme;
    final BridgeMode bridge = widget.bridge;

    final String headline;
    final Color headlineColor;
    switch (bridge.currentKind) {
      case BridgeEventKind.connecting:
        headline = 'Carrying to ${bridge.currentTarget ?? "…"}…';
        headlineColor = AppColors.info;
      case BridgeEventKind.syncing:
        headline = 'Syncing with ${bridge.currentTarget ?? "…"}';
        headlineColor = AppColors.p2;
      case BridgeEventKind.carried:
      case BridgeEventKind.delivered:
        headline = 'Carried at ${bridge.currentTarget ?? "…"}';
        headlineColor = AppColors.p3;
      case BridgeEventKind.failed:
        headline = 'Hop failed at ${bridge.currentTarget ?? "…"}';
        headlineColor = AppColors.p0;
      case BridgeEventKind.disconnected:
      case null:
        headline = _running ? 'Moving on…' : 'Idle';
        headlineColor =
            _running ? AppColors.textPrimary : AppColors.textSecondary;
    }

    return Container(
      width: double.infinity,
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(
                _running ? Icons.swap_horiz : Icons.pause_circle_outline,
                color: headlineColor,
                size: 26,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  headline,
                  style: text.titleLarge?.copyWith(color: headlineColor),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Both sides flex. At the default font scale neither truncates on a
          // phone; at a large one they ellipsize rather than overflow, which
          // matters because these two numbers are the whole demo.
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: <Widget>[
              // The headline metric.
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      '${bridge.relaysCompleted}',
                      maxLines: 1,
                      style: const TextStyle(
                        fontSize: 46,
                        height: 1.0,
                        fontWeight: FontWeight.w800,
                        color: AppColors.info,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'RELAYS COMPLETED',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: text.bodySmall?.copyWith(letterSpacing: 1.1),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: <Widget>[
                    // Measured on this run, not claimed.
                    Text(
                      bridge.perHopLabel,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.end,
                      style: text.titleLarge?.copyWith(color: AppColors.p3),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${bridge.hopsCompleted}/${bridge.hopsAttempted} hops',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: text.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _buildTargetChips(),
        ],
      ),
    );
  }

  Widget _buildTargetChips() {
    final List<BleDiscoveredDevice> chosen = _chosen;
    if (chosen.isEmpty) {
      return Text(
        'No hosts selected — pick at least ${BridgeMode.minimumTargets} below.',
        style: Theme.of(context).textTheme.bodySmall,
      );
    }

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: <Widget>[
        for (final BleDiscoveredDevice d in chosen)
          Builder(builder: (BuildContext context) {
            final String name =
                d.deviceName.isEmpty ? d.deviceAddress : d.deviceName;
            final bool current = widget.bridge.currentTarget == name;
            return StatusBadge(
              label: name,
              color: current ? AppColors.info : AppColors.textSecondary,
              icon: current ? Icons.my_location : Icons.location_on_outlined,
              dense: true,
            );
          }),
      ],
    );
  }

  // --- middle: relay log ---------------------------------------------------

  Widget _buildRelayLog() {
    final TextTheme text = Theme.of(context).textTheme;
    // Newest first — the thing that just happened is the thing being narrated.
    final List<BridgeEvent> shown = _events.reversed.toList(growable: false);

    return Column(
      children: <Widget>[
        Container(
          height: 44,
          width: double.infinity,
          color: AppColors.surfaceVariant,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  'RELAY LOG',
                  style: text.bodySmall?.copyWith(
                    letterSpacing: 1.2,
                    color: AppColors.textPrimary,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text('${widget.bridge.relaysCompleted} delivered',
                  style: text.bodySmall?.copyWith(color: AppColors.info)),
            ],
          ),
        ),
        Expanded(
          child: shown.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      'Nothing carried yet. Select two hosts and press Start; '
                      'a completed relay appears here the moment a message '
                      'picked up at one host reaches the other.',
                      textAlign: TextAlign.center,
                      style: text.bodySmall,
                    ),
                  ),
                )
              : ListView.builder(
                  padding: EdgeInsets.zero,
                  itemCount: shown.length,
                  itemBuilder: (BuildContext context, int i) =>
                      _BridgeEventRow(event: shown[i]),
                ),
        ),
      ],
    );
  }

  // --- bottom: controls ----------------------------------------------------

  Widget _buildControls() {
    final TextTheme text = Theme.of(context).textTheme;
    final int chosenCount = _chosen.length;
    final bool canStart =
        !_running && chosenCount >= BridgeMode.minimumTargets;

    return Container(
      color: AppColors.background,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'HOSTS TO BRIDGE  ($chosenCount selected)',
            style: text.bodySmall?.copyWith(letterSpacing: 1.2),
          ),
          const SizedBox(height: 4),
          if (widget.discovered.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(
                'No hosts discovered. Scan from the Mesh screen first.',
                style: text.bodySmall,
              ),
            )
          else
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 132),
              child: Material(
                // CheckboxListTile builds no Material of its own and would ink
                // onto the Scaffold's, underneath this Container's colour.
                type: MaterialType.transparency,
                child: ListView(
                  shrinkWrap: true,
                  padding: EdgeInsets.zero,
                  children: <Widget>[
                    for (final BleDiscoveredDevice d in widget.discovered)
                      CheckboxListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        controlAffinity: ListTileControlAffinity.leading,
                        value: _selected.contains(d.deviceAddress),
                        onChanged: _running
                            ? null
                            : (bool? on) {
                                setState(() {
                                  if (on ?? false) {
                                    _selected.add(d.deviceAddress);
                                  } else {
                                    _selected.remove(d.deviceAddress);
                                  }
                                });
                              },
                        title: Text(
                          d.deviceName.isEmpty
                              ? 'Unnamed host'
                              : d.deviceName,
                          style: text.bodyLarge,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle:
                            Text(d.deviceAddress, style: text.bodySmall),
                      ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 10),
          // Two per row, not four. Four across a phone gives each field about
          // 84dp — too narrow for the label to survive a large font scale, and
          // too narrow to tap comfortably with gloves on.
          Row(
            children: <Widget>[
              Expanded(
                child: _NumberField(
                  controller: _scanSeconds,
                  label: 'Scan s',
                  enabled: !_running,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _NumberField(
                  controller: _connectSeconds,
                  label: 'Connect s',
                  enabled: !_running,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: <Widget>[
              Expanded(
                child: _NumberField(
                  controller: _syncSeconds,
                  label: 'Sync s',
                  enabled: !_running,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _NumberField(
                  controller: _settleSeconds,
                  label: 'Settle s',
                  enabled: !_running,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_running)
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.p0),
              onPressed: _stop,
              icon: const Icon(Icons.stop),
              label: const Text('Stop bridging'),
            )
          else
            ElevatedButton.icon(
              onPressed: canStart ? _start : null,
              icon: const Icon(Icons.swap_horiz),
              label: Text(
                chosenCount < BridgeMode.minimumTargets
                    ? 'Select ${BridgeMode.minimumTargets} hosts to start'
                    : 'Start bridging',
              ),
            ),
        ],
      ),
    );
  }
}

/// One line of the relay log. `delivered` is the moment worth pointing at, so
/// it is the only kind rendered in the primary colour with a filled row.
class _BridgeEventRow extends StatelessWidget {
  const _BridgeEventRow({required this.event});

  final BridgeEvent event;

  static String _stamp(DateTime at) {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(at.hour)}:${two(at.minute)}:${two(at.second)}';
  }

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;
    final bool delivered = event.kind == BridgeEventKind.delivered;

    if (delivered) {
      return Container(
        color: AppColors.info.withValues(alpha: 0.14),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const Icon(Icons.check_circle, color: AppColors.info, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    '#${_short(event.messageId)}  '
                    '${event.sourceHost ?? "?"} → '
                    '${event.destinationHost ?? "?"}',
                    style: text.titleMedium?.copyWith(color: AppColors.info),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '${event.messageType ?? "MESSAGE"} delivered  ·  '
                    '${_stamp(event.at)}',
                    style: text.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final (String label, Color color) = switch (event.kind) {
      BridgeEventKind.connecting => ('connecting to ${event.targetName}',
          AppColors.textSecondary),
      BridgeEventKind.syncing =>
        ('syncing with ${event.targetName}', AppColors.textSecondary),
      BridgeEventKind.carried => (
          '${event.targetName}: +${event.messagesCarriedIn} in, '
              '${event.messagesCarriedOut} out',
          AppColors.textPrimary
        ),
      BridgeEventKind.disconnected =>
        ('left ${event.targetName}', AppColors.textSecondary),
      BridgeEventKind.failed => (
          '${event.targetName} failed — ${event.errorType ?? "unknown"}',
          AppColors.p0
        ),
      BridgeEventKind.delivered => ('', AppColors.info), // handled above
    };

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(_stamp(event.at),
              style: text.bodySmall?.copyWith(
                fontFamily: 'monospace',
                fontFamilyFallback: const <String>['Courier New', 'Courier'],
              )),
          const SizedBox(width: 10),
          Expanded(
            child: Text(label, style: text.bodyMedium?.copyWith(color: color)),
          ),
        ],
      ),
    );
  }

  static String _short(String? id) {
    if (id == null || id.isEmpty) return '????????';
    return id.length <= 8 ? id.toUpperCase() : id.substring(0, 8).toUpperCase();
  }
}

class _NumberField extends StatelessWidget {
  const _NumberField({
    required this.controller,
    required this.label,
    required this.enabled,
  });

  final TextEditingController controller;
  final String label;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      enabled: enabled,
      keyboardType: TextInputType.number,
      inputFormatters: <TextInputFormatter>[
        FilteringTextInputFormatter.digitsOnly,
      ],
      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      decoration: InputDecoration(
        labelText: label,
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      ),
    );
  }
}
