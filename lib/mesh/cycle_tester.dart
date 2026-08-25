import 'dart:async';

import 'package:flutter_p2p_connection/flutter_p2p_connection.dart';

import 'connection_manager.dart';
import 'message_store.dart';
import 'sync_protocol.dart';

/// A step that failed for a reason that is not itself an exception —
/// nothing was discovered, the wanted target was out of range, the operator
/// pressed Stop. [step] becomes the result's `errorType`, because "scan found
/// nothing" reads better in a results table than "CycleStepException".
class CycleStepException implements Exception {
  const CycleStepException(this.step, this.reason);

  final String step;
  final String reason;

  @override
  String toString() => '$step: $reason';
}

/// The outcome of one connect → sync → disconnect cycle.
///
/// A failed cycle is still a result. Failures are the point of the harness.
class CycleResult {
  const CycleResult({
    required this.cycleNumber,
    required this.startedAt,
    required this.scanSucceeded,
    required this.connectSucceeded,
    required this.scanDuration,
    required this.connectDuration,
    required this.totalCycleDuration,
    required this.messagesGained,
    required this.storeCountAfter,
    this.targetName,
    this.errorType,
    this.errorMessage,
  });

  final int cycleNumber;
  final DateTime startedAt;
  final bool scanSucceeded;
  final bool connectSucceeded;
  final Duration scanDuration;
  final Duration connectDuration;

  /// Scan through disconnect — steps 1 to 5. Deliberately excludes the idle
  /// settle between cycles, so this is the figure that stands in for a relay's
  /// per-hop latency rather than its duty period.
  final Duration totalCycleDuration;

  final int messagesGained;
  final int storeCountAfter;

  /// Host this cycle aimed at, for multi-target runs.
  final String? targetName;

  /// `runtimeType` of whatever was thrown, or the step name for a
  /// [CycleStepException].
  final String? errorType;
  final String? errorMessage;

  bool get succeeded =>
      scanSucceeded && connectSucceeded && errorType == null;

  static String _secs(Duration d) =>
      '${(d.inMilliseconds / 1000).toStringAsFixed(1)}s';

  /// One fixed-width line for the exported report.
  String toLogLine() {
    final String status = succeeded ? 'OK' : (errorType ?? 'FAIL');
    return '${cycleNumber.toString().padLeft(3)}  '
        '${_secs(scanDuration).padLeft(7)}  '
        '${_secs(connectDuration).padLeft(8)}  '
        '${_secs(totalCycleDuration).padLeft(7)}  '
        '${messagesGained.toString().padLeft(6)}  '
        '${storeCountAfter.toString().padLeft(5)}  '
        '$status'
        '${errorMessage == null ? '' : ' — $errorMessage'}';
  }

  static String get logHeader =>
      '  #     scan   connect    total  gained  store  status';
}

/// Aggregate statistics over a run.
class CycleSummary {
  const CycleSummary({
    required this.attempted,
    required this.completed,
    required this.meanConnect,
    required this.worstConnect,
    required this.meanTotal,
    required this.consecutiveFailures,
    required this.maxConsecutiveFailures,
    required this.totalGained,
  });

  factory CycleSummary.from(List<CycleResult> results) {
    if (results.isEmpty) {
      return const CycleSummary(
        attempted: 0,
        completed: 0,
        meanConnect: Duration.zero,
        worstConnect: Duration.zero,
        meanTotal: Duration.zero,
        consecutiveFailures: 0,
        maxConsecutiveFailures: 0,
        totalGained: 0,
      );
    }

    // Connect timings are averaged over successful connects only. Including a
    // failed connect would fold the 20s timeout into the mean and make a
    // degrading radio look slower than it is, blurring the real signal.
    final List<CycleResult> connected = <CycleResult>[
      for (final CycleResult r in results)
        if (r.connectSucceeded) r,
    ];

    int connectMicros = 0;
    int worstMicros = 0;
    for (final CycleResult r in connected) {
      connectMicros += r.connectDuration.inMicroseconds;
      if (r.connectDuration.inMicroseconds > worstMicros) {
        worstMicros = r.connectDuration.inMicroseconds;
      }
    }

    int totalMicros = 0;
    int gained = 0;
    int completed = 0;
    int streak = 0;
    int maxStreak = 0;
    for (final CycleResult r in results) {
      totalMicros += r.totalCycleDuration.inMicroseconds;
      gained += r.messagesGained;
      if (r.succeeded) {
        completed++;
        streak = 0;
      } else {
        streak++;
        if (streak > maxStreak) maxStreak = streak;
      }
    }

    return CycleSummary(
      attempted: results.length,
      completed: completed,
      meanConnect: connected.isEmpty
          ? Duration.zero
          : Duration(microseconds: connectMicros ~/ connected.length),
      worstConnect: Duration(microseconds: worstMicros),
      meanTotal: Duration(microseconds: totalMicros ~/ results.length),
      consecutiveFailures: streak,
      maxConsecutiveFailures: maxStreak,
      totalGained: gained,
    );
  }

  final int attempted;
  final int completed;
  final Duration meanConnect;
  final Duration worstConnect;
  final Duration meanTotal;

  /// Failures at the tail of the run. A rising number here is the radio
  /// degradation signal — an isolated failure is noise, five in a row is not.
  final int consecutiveFailures;
  final int maxConsecutiveFailures;
  final int totalGained;

  /// 0..100.
  double get successRate =>
      attempted == 0 ? 0 : (completed / attempted) * 100;
}

/// Repeated connect → sync → disconnect cycles against one or more hosts.
///
/// Runs on the CLIENT side. With two phones this reproduces a bridge node's
/// duty cycle: arrive, reconcile, leave, wait, repeat. The only difference
/// from a real relay is that a single-target run returns to the same host
/// instead of alternating — pass more than one entry in [targets] and it
/// alternates round-robin instead, with no other change.
///
/// ## Ownership
///
/// The tester drives a [ConnectionManager]; it never touches the plugin
/// directly. Everything about *how* to connect safely — state guards,
/// cooldown, backoff, watchdogs, the circuit breaker — lives in the manager,
/// so the harness and the Mesh screen's manual controls exercise exactly the
/// same hardened path. A bug that only showed up in one of them would be a bug
/// found on stage.
///
/// The manager also owns re-binding transport-scoped streams after each
/// connect (`ConnectionManager.onConnected`), which is mandatory:
/// `streamReceivedTexts()` completes for good when `disconnect()` disposes the
/// transport, so without a re-bind every cycle after the first would report
/// `messagesGained: 0` and blame the radio for a dead listener.
class CycleTester {
  CycleTester({
    required this.connection,
    required this.store,
    required this.protocol,
    this.targets = const <BleDiscoveredDevice>[],
    this.cycleCount,
    this.syncSettle = const Duration(seconds: 6),
    this.settleDelay = const Duration(seconds: 5),
    this.onLog,
  });

  final ConnectionManager connection;
  final MessageStore store;
  final SyncProtocol protocol;

  /// Hosts to visit, round-robin. Empty means "whatever the scan turns up
  /// first", which is the two-phone case.
  final List<BleDiscoveredDevice> targets;

  /// Null runs until [stop].
  final int? cycleCount;

  /// Harness pacing. Scan and connect timings belong to the manager's
  /// [ConnectionTuning], not here.
  final Duration syncSettle;
  final Duration settleDelay;

  final void Function(String line)? onLog;

  final StreamController<CycleResult> _controller =
      StreamController<CycleResult>.broadcast();

  bool _running = false;
  bool _stopRequested = false;
  Completer<void>? _finished;

  Timer? _sleepTimer;
  Completer<void>? _sleepCompleter;

  Stream<CycleResult> get results => _controller.stream;
  bool get isRunning => _running;

  void _log(String line) => onLog?.call(line);

  // --- lifecycle -----------------------------------------------------------

  /// Runs the cycle loop. Completes when the run finishes or is stopped.
  Future<void> start() async {
    if (_running) return;
    _running = true;
    _stopRequested = false;
    final Completer<void> finished = Completer<void>();
    _finished = finished;

    final ConnectionTuning tuning = connection.tuning;
    _log('cycle test starting — '
        '${cycleCount == null ? 'infinite' : '$cycleCount cycle(s)'}, '
        'scan ${tuning.scanTimeout.inSeconds}s / '
        'connect ${tuning.connectTimeout.inSeconds}s / '
        'sync ${syncSettle.inSeconds}s / settle ${settleDelay.inSeconds}s, '
        'cooldown ${tuning.cooldown.inSeconds}s / '
        'breaker at ${tuning.failureThreshold}');

    try {
      // Begin from a known state so cycle 1 is identical to cycle N.
      await connection.disconnect();

      int n = 0;
      while (!_stopRequested && (cycleCount == null || n < cycleCount!)) {
        n++;
        final CycleResult result = await _runOneCycle(n);
        if (!_controller.isClosed) _controller.add(result);
        _log(result.toLogLine());

        if (_stopRequested) break;
        if (cycleCount != null && n >= cycleCount!) break;
        await _sleep(settleDelay);
      }
    } finally {
      // Whatever happened, leave the radio idle and disconnected.
      await connection.disconnect();
      _running = false;
      _finished = null;
      if (!finished.isCompleted) finished.complete();
      _log('cycle test finished');
    }
  }

  /// Halts the run and returns once the radio is back to a clean state.
  ///
  /// A `connectWithDevice` already in flight cannot be cancelled, so this can
  /// take up to [connectTimeout] to return. It always returns having stopped
  /// the scan and disconnected.
  Future<void> stop() async {
    if (!_running) {
      await connection.disconnect();
      return;
    }
    _log('stop requested');
    _stopRequested = true;
    _breakSleep();
    await _finished?.future;
  }

  /// Stops the run and closes [results].
  Future<void> dispose() async {
    await stop();
    if (!_controller.isClosed) await _controller.close();
  }

  // --- one cycle -----------------------------------------------------------

  Future<CycleResult> _runOneCycle(int cycleNumber) async {
    final DateTime startedAt = DateTime.now();
    final Stopwatch total = Stopwatch()..start();
    final int storeBefore = store.count;

    bool scanSucceeded = false;
    bool connectSucceeded = false;
    Duration scanDuration = Duration.zero;
    Duration connectDuration = Duration.zero;
    String? targetName;
    String? errorType;
    String? errorMessage;

    try {
      // 1. Scan. The manager applies cooldown, backoff and the circuit breaker
      // before it starts, and its watchdog bounds how long it can take.
      final int index = cycleNumber - 1;
      final OperationOutcome<List<BleDiscoveredDevice>> scan =
          await connection.scan(
        isEnough: (List<BleDiscoveredDevice> d) => selectTarget(d, index) != null,
      );
      scanDuration = scan.duration;

      if (scan.rejected) {
        throw CycleStepException(
            'Rejected', scan.errorMessage ?? 'scan refused by state guard');
      }
      if (scan.errorType != null) {
        throw CycleStepException(
            scan.errorType!, scan.errorMessage ?? 'scan failed');
      }

      final List<BleDiscoveredDevice> found =
          scan.value ?? const <BleDiscoveredDevice>[];
      scanSucceeded = found.isNotEmpty;
      if (!scanSucceeded) {
        // The manager cannot know an empty scan is a problem — it has no idea
        // a host was supposed to be there. Tell it, so a radio that has gone
        // deaf still counts toward backoff and the breaker.
        connection.noteFailure('NoHostsFound');
        throw const CycleStepException('NoHostsFound', 'scan found no hosts');
      }
      _throwIfStopped('scan');

      final BleDiscoveredDevice? target = selectTarget(found, index);
      if (target == null) {
        connection.noteFailure('TargetNotFound');
        throw const CycleStepException(
            'TargetNotFound', 'wanted host was not in range this cycle');
      }
      targetName =
          target.deviceName.isEmpty ? target.deviceAddress : target.deviceName;

      // 2. Connect. onConnected (stream re-binding) fires inside this call,
      // before it returns, so the digest below cannot outrun it.
      final OperationOutcome<void> connectOutcome =
          await connection.connect(target);
      connectDuration = connectOutcome.duration;

      if (connectOutcome.rejected) {
        throw CycleStepException('Rejected',
            connectOutcome.errorMessage ?? 'connect refused by state guard');
      }
      if (!connectOutcome.succeeded) {
        throw CycleStepException(connectOutcome.errorType ?? 'ConnectFailed',
            connectOutcome.errorMessage ?? 'connect failed');
      }
      connectSucceeded = true;
      _throwIfStopped('connect');

      // 3. Digest, then let the exchange settle.
      await connection.broadcastText(protocol.buildDigest(store));
      await _sleep(syncSettle);
      _throwIfStopped('sync');
    } catch (e) {
      errorType = e is CycleStepException ? e.step : e.runtimeType.toString();
      errorMessage = e.toString();
    }

    // 5. Disconnect — unconditionally, including after a failure. Leaving the
    // radio attached is how a run degrades into meaningless data. Idempotent,
    // so a failure path that already tore down is a logged no-op.
    await connection.disconnect();
    total.stop();

    return CycleResult(
      cycleNumber: cycleNumber,
      startedAt: startedAt,
      scanSucceeded: scanSucceeded,
      connectSucceeded: connectSucceeded,
      scanDuration: scanDuration,
      connectDuration: connectDuration,
      totalCycleDuration: total.elapsed,
      messagesGained: store.count - storeBefore,
      storeCountAfter: store.count,
      targetName: targetName,
      errorType: errorType,
      errorMessage: errorMessage,
    );
  }

  void _throwIfStopped(String step) {
    if (_stopRequested) {
      throw CycleStepException('StoppedByUser', 'stopped during $step');
    }
  }

  /// Which host this cycle should visit.
  ///
  /// With [targets] empty, the first host the scan turned up. Otherwise the
  /// round-robin entry for this cycle, matched against the scan by address so
  /// the freshly discovered instance is the one handed to `connectWithDevice`.
  /// Returns null when the wanted host is not in range — a real, recordable
  /// failure rather than a silent substitution.
  ///
  /// Visible for the screen and for tests.
  BleDiscoveredDevice? selectTarget(
    List<BleDiscoveredDevice> discovered,
    int cycleIndex,
  ) {
    if (targets.isEmpty) {
      return discovered.isEmpty ? null : discovered.first;
    }
    final BleDiscoveredDevice wanted = targets[cycleIndex % targets.length];
    for (final BleDiscoveredDevice d in discovered) {
      if (d.deviceAddress == wanted.deviceAddress) return d;
    }
    return null;
  }

  // --- helpers -------------------------------------------------------------

  /// A delay that [stop] can cut short, so pressing Stop during the 5s settle
  /// does not leave the operator waiting.
  Future<void> _sleep(Duration d) {
    if (d <= Duration.zero) return Future<void>.value();
    final Completer<void> completer = Completer<void>();
    _sleepCompleter = completer;
    _sleepTimer = Timer(d, () {
      if (!completer.isCompleted) completer.complete();
    });
    return completer.future;
  }

  void _breakSleep() {
    _sleepTimer?.cancel();
    _sleepTimer = null;
    final Completer<void>? completer = _sleepCompleter;
    _sleepCompleter = null;
    if (completer != null && !completer.isCompleted) completer.complete();
  }
}
