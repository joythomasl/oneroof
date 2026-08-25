import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_p2p_connection/flutter_p2p_connection.dart';

import '../../mesh/cycle_tester.dart';
import '../../mesh/device_identity.dart';
import '../../mesh/message_store.dart';
import '../../mesh/sync_protocol.dart';
import '../../theme/app_theme.dart';

/// Column widths for the results table, in logical pixels. The table scrolls
/// horizontally as a unit so the columns can stay readable on a phone.
class _Col {
  static const double number = 44;
  static const double scan = 72;
  static const double connect = 82;
  static const double total = 72;
  static const double gained = 70;
  static const double store = 64;
  static const double status = 160;
  static const double total_ =
      number + scan + connect + total + gained + store + status;
}

/// Runs [CycleTester] and shows the results live.
///
/// Needs a [FlutterP2pClient] that has already been initialised — the Mesh
/// screen creates one when you tap "Join as client", and hands it here.
class CycleTestScreen extends StatefulWidget {
  const CycleTestScreen({
    super.key,
    required this.client,
    required this.store,
    required this.protocol,
    required this.onConnected,
    this.knownTargets = const <BleDiscoveredDevice>[],
  });

  final FlutterP2pClient client;
  final MessageStore store;
  final SyncProtocol protocol;

  /// Re-binds the Mesh screen's transport-scoped streams after each reconnect.
  /// See [CycleTester]'s class doc for why this is mandatory.
  final Future<void> Function() onConnected;

  /// Hosts already discovered by the Mesh screen. Passed through to
  /// [CycleTester.targets] for round-robin runs; empty means "first found".
  final List<BleDiscoveredDevice> knownTargets;

  @override
  State<CycleTestScreen> createState() => _CycleTestScreenState();
}

class _CycleTestScreenState extends State<CycleTestScreen> {
  final TextEditingController _cycles = TextEditingController(text: '10');
  final TextEditingController _scanSeconds = TextEditingController(text: '8');
  final TextEditingController _connectSeconds =
      TextEditingController(text: '20');
  final TextEditingController _syncSeconds = TextEditingController(text: '6');
  final TextEditingController _settleSeconds = TextEditingController(text: '5');

  bool _infinite = false;
  bool _running = false;
  final List<CycleResult> _results = <CycleResult>[];
  final List<String> _log = <String>[];

  CycleTester? _tester;
  StreamSubscription<CycleResult>? _sub;
  final ScrollController _tableScroll = ScrollController();

  @override
  void dispose() {
    _sub?.cancel();
    // Stops the run and leaves the radio disconnected. Safe to fire and
    // forget: CycleTester never touches a BuildContext.
    unawaited(_tester?.dispose());
    _cycles.dispose();
    _scanSeconds.dispose();
    _connectSeconds.dispose();
    _syncSeconds.dispose();
    _settleSeconds.dispose();
    _tableScroll.dispose();
    super.dispose();
  }

  Duration _seconds(TextEditingController c, int fallback) {
    final int? parsed = int.tryParse(c.text.trim());
    return Duration(seconds: (parsed == null || parsed <= 0) ? fallback : parsed);
  }

  Future<void> _start() async {
    if (_running) return;

    final int? count =
        _infinite ? null : (int.tryParse(_cycles.text.trim()) ?? 10);

    final CycleTester tester = CycleTester(
      client: widget.client,
      store: widget.store,
      protocol: widget.protocol,
      targets: widget.knownTargets,
      cycleCount: count,
      scanTimeout: _seconds(_scanSeconds, 8),
      connectTimeout: _seconds(_connectSeconds, 20),
      syncSettle: _seconds(_syncSeconds, 6),
      settleDelay: _seconds(_settleSeconds, 5),
      onConnected: widget.onConnected,
      onLog: (String line) {
        if (!mounted) return;
        setState(() => _log.add(line));
      },
    );

    _tester = tester;
    _sub = tester.results.listen((CycleResult r) {
      if (!mounted) return;
      setState(() => _results.add(r));
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!_tableScroll.hasClients) return;
        _tableScroll.jumpTo(_tableScroll.position.maxScrollExtent);
      });
    });

    setState(() {
      _running = true;
      _results.clear();
      _log.clear();
    });

    await tester.start();

    if (!mounted) return;
    setState(() => _running = false);
  }

  Future<void> _stop() async {
    final CycleTester? tester = _tester;
    if (tester == null) return;
    setState(() => _running = false);
    await tester.stop();
  }

  // --- export --------------------------------------------------------------

  String _buildReport() {
    final CycleSummary s = CycleSummary.from(_results);
    final StringBuffer b = StringBuffer()
      ..writeln('Samanvay Responder — mesh cycle test')
      ..writeln('device      : ${DeviceIdentity.shortDeviceId}')
      ..writeln('generated   : ${DateTime.now().toIso8601String()}')
      ..writeln('targets     : ${widget.knownTargets.isEmpty ? "first found" : "${widget.knownTargets.length} (round-robin)"}')
      ..writeln('timings     : scan ${_seconds(_scanSeconds, 8).inSeconds}s, '
          'connect ${_seconds(_connectSeconds, 20).inSeconds}s, '
          'sync ${_seconds(_syncSeconds, 6).inSeconds}s, '
          'settle ${_seconds(_settleSeconds, 5).inSeconds}s')
      ..writeln('cycles      : ${_infinite ? "infinite" : _cycles.text.trim()}')
      ..writeln()
      ..writeln('SUMMARY')
      ..writeln('  completed          : ${s.completed}/${s.attempted}')
      ..writeln('  success rate       : ${s.successRate.toStringAsFixed(1)}%')
      ..writeln('  connect mean/worst : ${_fmt(s.meanConnect)} / ${_fmt(s.worstConnect)}')
      ..writeln('  cycle mean         : ${_fmt(s.meanTotal)}')
      ..writeln('  consecutive fails  : ${s.consecutiveFailures} (max ${s.maxConsecutiveFailures})')
      ..writeln('  messages gained    : ${s.totalGained}')
      ..writeln()
      ..writeln('CYCLES')
      ..writeln(CycleResult.logHeader);

    for (final CycleResult r in _results) {
      b.writeln(r.toLogLine());
    }

    if (_log.isNotEmpty) {
      b
        ..writeln()
        ..writeln('RUN LOG');
      for (final String line in _log) {
        b.writeln('  $line');
      }
    }
    return b.toString();
  }

  Future<void> _showReport() async {
    final String report = _buildReport();
    await showDialog<void>(
      context: context,
      builder: (BuildContext context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Cycle test report'),
        content: SizedBox(
          width: double.maxFinite,
          child: SingleChildScrollView(
            child: SelectableText(
              report,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontFamilyFallback: <String>['Courier New', 'Courier'],
                fontSize: 11,
                height: 1.4,
              ),
            ),
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
          ElevatedButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: report));
              if (!context.mounted) return;
              Navigator.of(context).pop();
              ScaffoldMessenger.of(context)
                ..hideCurrentSnackBar()
                ..showSnackBar(
                  const SnackBar(content: Text('Report copied to clipboard')),
                );
            },
            icon: const Icon(Icons.copy, size: 20),
            label: const Text('Copy'),
          ),
        ],
      ),
    );
  }

  static String _fmt(Duration d) =>
      '${(d.inMilliseconds / 1000).toStringAsFixed(1)}s';

  // --- build ---------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cycle test'),
        actions: <Widget>[
          IconButton(
            iconSize: 26,
            tooltip: 'Export log',
            icon: const Icon(Icons.ios_share),
            onPressed: _results.isEmpty ? null : _showReport,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: <Widget>[
            _buildSummary(),
            _buildControls(),
            const Divider(height: 1),
            _buildTableHeader(),
            Expanded(child: _buildTable()),
          ],
        ),
      ),
    );
  }

  Widget _buildSummary() {
    final TextTheme text = Theme.of(context).textTheme;
    final CycleSummary s = CycleSummary.from(_results);
    final bool degrading = s.consecutiveFailures >= 2;

    return Container(
      width: double.infinity,
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              StatusBadge(
                label: _running ? 'RUNNING' : 'IDLE',
                color: _running ? AppColors.p3 : AppColors.textSecondary,
                icon: _running ? Icons.loop : Icons.pause,
                dense: true,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '${s.completed}/${s.attempted} cycles  ·  '
                  '${s.successRate.toStringAsFixed(0)}% success',
                  style: text.titleMedium,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _StatLine(
            label: 'Connect mean / worst',
            value: '${_fmt(s.meanConnect)} / ${_fmt(s.worstConnect)}',
          ),
          _StatLine(
            label: 'Cycle mean (per-hop)',
            value: _fmt(s.meanTotal),
            emphasise: true,
          ),
          _StatLine(
            label: 'Consecutive failures',
            value: '${s.consecutiveFailures}  (max ${s.maxConsecutiveFailures})',
            color: degrading ? AppColors.p0 : null,
          ),
          _StatLine(
            label: 'Messages gained',
            value: '${s.totalGained}  ·  store ${widget.store.count}',
          ),
          if (degrading) ...<Widget>[
            const SizedBox(height: 8),
            Text(
              'Consecutive failures are climbing — that is the radio '
              'degradation signal, not noise.',
              style: text.bodySmall?.copyWith(color: AppColors.p0),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildControls() {
    final TextTheme text = Theme.of(context).textTheme;

    return Container(
      color: AppColors.background,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              SizedBox(
                width: 108,
                child: _NumberField(
                  controller: _cycles,
                  label: 'Cycles',
                  enabled: !_running && !_infinite,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Row(
                  children: <Widget>[
                    Expanded(
                      child: Text('Infinite',
                          style: text.bodyMedium,
                          overflow: TextOverflow.ellipsis),
                    ),
                    Switch(
                      value: _infinite,
                      onChanged: _running
                          ? null
                          : (bool v) => setState(() => _infinite = v),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
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
          const SizedBox(height: 10),
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
          const SizedBox(height: 14),
          if (_running)
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.p0),
              onPressed: _stop,
              icon: const Icon(Icons.stop),
              label: const Text('Stop'),
            )
          else
            ElevatedButton.icon(
              onPressed: _start,
              icon: const Icon(Icons.play_arrow),
              label: const Text('Start'),
            ),
        ],
      ),
    );
  }

  Widget _buildTableHeader() {
    return Container(
      height: 40,
      color: AppColors.surfaceVariant,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        physics: const NeverScrollableScrollPhysics(),
        child: SizedBox(
          width: _Col.total_,
          child: Row(
            children: const <Widget>[
              _HeaderCell('#', _Col.number),
              _HeaderCell('scan', _Col.scan),
              _HeaderCell('connect', _Col.connect),
              _HeaderCell('total', _Col.total),
              _HeaderCell('gained', _Col.gained),
              _HeaderCell('store', _Col.store),
              _HeaderCell('status', _Col.status),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTable() {
    if (_results.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            _running
                ? 'Cycle 1 running…'
                : 'No cycles yet. Set the timings and press Start.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
      );
    }

    // One horizontal scroll view wrapping the whole table so the rows cannot
    // drift out of alignment with each other.
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: SizedBox(
        width: _Col.total_,
        child: ListView.separated(
          controller: _tableScroll,
          itemCount: _results.length,
          separatorBuilder: (_, _) => const Divider(height: 1),
          itemBuilder: (BuildContext context, int i) =>
              _ResultRow(result: _results[i]),
        ),
      ),
    );
  }
}

class _StatLine extends StatelessWidget {
  const _StatLine({
    required this.label,
    required this.value,
    this.color,
    this.emphasise = false,
  });

  final String label;
  final String value;
  final Color? color;
  final bool emphasise;

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Text(label,
                style: text.bodySmall, overflow: TextOverflow.ellipsis),
          ),
          const SizedBox(width: 10),
          Text(
            value,
            style: (emphasise ? text.titleMedium : text.bodyMedium)
                ?.copyWith(color: color ?? AppColors.textPrimary),
          ),
        ],
      ),
    );
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
      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
      decoration: InputDecoration(
        labelText: label,
        isDense: true,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      ),
    );
  }
}

class _HeaderCell extends StatelessWidget {
  const _HeaderCell(this.label, this.width);

  final String label;
  final double width;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6),
        child: Align(
          alignment: Alignment.centerLeft,
          child: Text(
            label.toUpperCase(),
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
              color: AppColors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }
}

/// One cycle. Green when the whole cycle went through, red with the error
/// type when it did not.
class _ResultRow extends StatelessWidget {
  const _ResultRow({required this.result});

  final CycleResult result;

  static String _secs(Duration d) =>
      '${(d.inMilliseconds / 1000).toStringAsFixed(1)}s';

  @override
  Widget build(BuildContext context) {
    final bool ok = result.succeeded;
    final Color tint = ok ? AppColors.p3 : AppColors.p0;

    return Container(
      color: tint.withValues(alpha: 0.10),
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: <Widget>[
          _Cell('${result.cycleNumber}', _Col.number, color: tint, bold: true),
          _Cell(_secs(result.scanDuration), _Col.scan),
          _Cell(
            result.connectSucceeded ? _secs(result.connectDuration) : '—',
            _Col.connect,
            bold: true,
          ),
          _Cell(_secs(result.totalCycleDuration), _Col.total),
          _Cell(
            result.messagesGained > 0 ? '+${result.messagesGained}' : '0',
            _Col.gained,
            color: result.messagesGained > 0 ? AppColors.info : null,
          ),
          _Cell('${result.storeCountAfter}', _Col.store),
          _Cell(
            ok ? 'OK' : (result.errorType ?? 'FAIL'),
            _Col.status,
            color: tint,
            bold: true,
          ),
        ],
      ),
    );
  }
}

class _Cell extends StatelessWidget {
  const _Cell(this.text, this.width, {this.color, this.bold = false});

  final String text;
  final double width;
  final Color? color;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6),
        child: Text(
          text,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontFamily: 'monospace',
            fontFamilyFallback: const <String>['Courier New', 'Courier'],
            fontSize: 13,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
            color: color ?? AppColors.textPrimary,
          ),
        ),
      ),
    );
  }
}
