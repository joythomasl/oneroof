import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_p2p_connection/flutter_p2p_connection.dart';

/// Where the client-side connection currently is.
///
/// Only one operation may be in flight at a time, and the state is what
/// enforces that. Overlapping connects are the classic way to wedge the
/// Wi-Fi Direct stack, so a second connect is refused rather than queued.
enum MeshConnectionState {
  idle,
  scanning,
  connecting,
  connected,
  disconnecting,

  /// Mandatory quiet period after a disconnect. Android needs time to tear the
  /// group down; scanning inside this window returns stale results.
  cooldown,

  /// Circuit breaker fired: the client is being destroyed and rebuilt.
  recovering,
}

extension MeshConnectionStateLabel on MeshConnectionState {
  String get label => switch (this) {
        MeshConnectionState.idle => 'IDLE',
        MeshConnectionState.scanning => 'SCANNING',
        MeshConnectionState.connecting => 'CONNECTING',
        MeshConnectionState.connected => 'CONNECTED',
        MeshConnectionState.disconnecting => 'DISCONNECTING',
        MeshConnectionState.cooldown => 'COOLDOWN',
        MeshConnectionState.recovering => 'RECOVERING',
      };
}

/// An operation blew through its hard ceiling.
///
/// Distinct from the plugin's own `TimeoutException` on purpose: a refusal and
/// a hang are different failures, and the difference is the whole signal when
/// you are hunting a wedged radio.
class WatchdogTimeout implements Exception {
  const WatchdogTimeout(this.operation, this.limit);

  /// Value used for `lastFailureType` and result rows.
  static const String type = 'WATCHDOG_TIMEOUT';

  final String operation;
  final Duration limit;

  @override
  String toString() =>
      'WATCHDOG_TIMEOUT: $operation exceeded ${limit.inSeconds}s';
}

/// Result of one managed operation.
///
/// Nothing here throws on rejection: a refused transition is a logged no-op,
/// and [rejected] is how the caller tells "I was not allowed to try" apart
/// from "I tried and it failed".
class OperationOutcome<T> {
  const OperationOutcome({
    this.value,
    this.duration = Duration.zero,
    this.rejected = false,
    this.errorType,
    this.errorMessage,
  });

  const OperationOutcome.refused(String reason)
      : value = null,
        duration = Duration.zero,
        rejected = true,
        errorType = 'InvalidState',
        errorMessage = reason;

  final T? value;
  final Duration duration;
  final bool rejected;
  final String? errorType;
  final String? errorMessage;

  bool get succeeded => !rejected && errorType == null;
}

/// Everything tunable about the connection policy.
///
/// Swappable at runtime (while idle) so the cycle-test harness can retune on
/// real hardware without rebuilding the manager.
class ConnectionTuning {
  const ConnectionTuning({
    this.scanTimeout = const Duration(seconds: 8),
    this.connectTimeout = const Duration(seconds: 20),
    this.cooldown = const Duration(seconds: 4),
    this.backoffBase = const Duration(seconds: 1),
    this.backoffCap = const Duration(seconds: 30),
    this.failureThreshold = 3,
    this.recoveryPause = const Duration(seconds: 8),
    this.scanWatchdog = const Duration(seconds: 12),
    this.connectWatchdog = const Duration(seconds: 25),
    this.disconnectWatchdog = const Duration(seconds: 8),
  });

  /// BLE scan window handed to the plugin.
  final Duration scanTimeout;

  /// Timeout handed to `connectWithDevice`.
  final Duration connectTimeout;

  /// Quiet period after every disconnect, before a scan is permitted.
  final Duration cooldown;

  final Duration backoffBase;
  final Duration backoffCap;

  /// Consecutive failures that trip the circuit breaker.
  final int failureThreshold;

  /// How long to stay dark while the client is rebuilt.
  final Duration recoveryPause;

  // Hard ceilings. Always longer than the matching operation timeout — they
  // catch a call that never returns at all, not one that fails slowly.
  final Duration scanWatchdog;
  final Duration connectWatchdog;
  final Duration disconnectWatchdog;

  ConnectionTuning copyWith({
    Duration? scanTimeout,
    Duration? connectTimeout,
    Duration? cooldown,
    Duration? backoffBase,
    Duration? backoffCap,
    int? failureThreshold,
    Duration? recoveryPause,
    Duration? scanWatchdog,
    Duration? connectWatchdog,
    Duration? disconnectWatchdog,
  }) {
    return ConnectionTuning(
      scanTimeout: scanTimeout ?? this.scanTimeout,
      connectTimeout: connectTimeout ?? this.connectTimeout,
      cooldown: cooldown ?? this.cooldown,
      backoffBase: backoffBase ?? this.backoffBase,
      backoffCap: backoffCap ?? this.backoffCap,
      failureThreshold: failureThreshold ?? this.failureThreshold,
      recoveryPause: recoveryPause ?? this.recoveryPause,
      scanWatchdog: scanWatchdog ?? this.scanWatchdog,
      connectWatchdog: connectWatchdog ?? this.connectWatchdog,
      disconnectWatchdog: disconnectWatchdog ?? this.disconnectWatchdog,
    );
  }
}

/// Point-in-time view of connection health, for the UI and for reports.
class ConnectionHealth {
  const ConnectionHealth({
    required this.state,
    required this.consecutiveFailures,
    required this.totalAttempts,
    required this.totalSuccesses,
    required this.recoveryCount,
    required this.timeInCurrentState,
    this.lastFailureType,
  });

  final MeshConnectionState state;

  /// Failures since the last success. Drives backoff and the circuit breaker;
  /// a climbing value is the radio-degradation signal.
  final int consecutiveFailures;

  /// Connect attempts, successful or not.
  final int totalAttempts;
  final int totalSuccesses;

  /// How many times the client has been destroyed and rebuilt.
  final int recoveryCount;

  final Duration timeInCurrentState;
  final String? lastFailureType;

  double get successRate =>
      totalAttempts == 0 ? 0 : (totalSuccesses / totalAttempts) * 100;
}

/// Builds a client. Injectable so tests can drive the state machine without a
/// radio, and so recovery can build a genuinely new instance.
typedef P2pClientFactory = FlutterP2pClient Function();

/// One line of connection narration. [failure] lets the caller colour it
/// without parsing the text.
typedef ConnectionLogSink = void Function(String line, bool failure);

/// State machine wrapping the client-side connection lifecycle.
///
/// It exists for one failure mode: repeated connect/disconnect cycles wedging
/// the Wi-Fi radio, so cycle 8 fails where cycle 1 was fine. The defences,
/// in the order they engage:
///
/// 1. **State guards** — one operation at a time. A second `connect()` while
///    one is in flight is a logged no-op, never a concurrent attempt.
/// 2. **Cooldown** — every disconnect is followed by a mandatory quiet period
///    before any scan.
/// 3. **Backoff** — `base * 2^consecutiveFailures`, capped, applied before a
///    retry scan. Reset by any success.
/// 4. **Circuit breaker** — at [ConnectionTuning.failureThreshold] consecutive
///    failures, stop retrying and rebuild the client from scratch.
/// 5. **Watchdogs** — every operation has a hard ceiling; exceeding it aborts
///    into cooldown instead of hanging.
///
/// ## Ownership
///
/// The manager OWNS the [FlutterP2pClient]. It constructs it, initialises it,
/// and — during recovery — disposes it and builds another. Callers must never
/// hold onto [client] across an await: after a recovery the old instance is
/// disposed and every stream taken from it is dead. Read [client] at the point
/// of use, and re-bind streams in [onClientChanged].
class ConnectionManager extends ChangeNotifier {
  ConnectionManager({
    required this.username,
    ConnectionTuning tuning = const ConnectionTuning(),
    P2pClientFactory? clientFactory,
    this.onConnected,
    this.onClientChanged,
    this.onLog,
  }) {
    // Assigned in the body rather than the initializer list: both back
    // public API with different names (`tuning` has a guarded setter, and a
    // named parameter cannot be private).
    _tuning = tuning;
    _clientFactory = clientFactory;
  }

  final String username;

  /// Fired after every successful connect, BEFORE `connect()` returns — so
  /// anything the caller does next (sending a digest, say) is guaranteed to
  /// happen after transport-scoped streams have been re-bound.
  final Future<void> Function()? onConnected;

  /// Fired whenever a new client instance exists: once at [initialize], and
  /// again after every recovery. Re-bind long-lived client streams here.
  final Future<void> Function(FlutterP2pClient client)? onClientChanged;

  final ConnectionLogSink? onLog;

  P2pClientFactory? _clientFactory;

  ConnectionTuning _tuning = const ConnectionTuning();
  ConnectionTuning get tuning => _tuning;

  /// Retune between runs. Refused mid-operation so a run cannot change its own
  /// ceilings underneath itself.
  set tuning(ConnectionTuning value) {
    if (_state != MeshConnectionState.idle &&
        _state != MeshConnectionState.cooldown) {
      _log('tuning change refused in ${_state.label}', true);
      return;
    }
    _tuning = value;
    notifyListeners();
  }

  FlutterP2pClient? _client;

  /// Current client. Never cache this across an await — see the class doc.
  FlutterP2pClient? get client => _client;

  MeshConnectionState _state = MeshConnectionState.idle;
  DateTime _stateSince = DateTime.now();

  int _consecutiveFailures = 0;
  int _totalAttempts = 0;
  int _totalSuccesses = 0;
  int _recoveryCount = 0;
  String? _lastFailureType;

  DateTime? _cooldownUntil;
  Timer? _cooldownTimer;
  bool _backoffServed = false;
  bool _disposed = false;

  MeshConnectionState get state => _state;
  bool get isConnected => _state == MeshConnectionState.connected;
  int get consecutiveFailures => _consecutiveFailures;
  int get recoveryCount => _recoveryCount;

  ConnectionHealth get health => ConnectionHealth(
        state: _state,
        consecutiveFailures: _consecutiveFailures,
        totalAttempts: _totalAttempts,
        totalSuccesses: _totalSuccesses,
        recoveryCount: _recoveryCount,
        timeInCurrentState: DateTime.now().difference(_stateSince),
        lastFailureType: _lastFailureType,
      );

  // --- lifecycle -----------------------------------------------------------

  /// Builds and initialises the first client.
  Future<void> initialize() async {
    if (_client != null) {
      _log('already initialised', false);
      return;
    }
    final FlutterP2pClient fresh = _newClient();
    await fresh.initialize();
    if (_disposed) {
      unawaited(fresh.dispose());
      return;
    }
    _client = fresh;
    _log('client ready', false);
    await onClientChanged?.call(fresh);
    _setState(MeshConnectionState.idle, 'initialised');
  }

  @override
  void dispose() {
    _disposed = true;
    _cooldownTimer?.cancel();
    _cooldownTimer = null;
    final FlutterP2pClient? old = _client;
    _client = null;
    if (old != null) unawaited(old.dispose());
    super.dispose();
  }

  FlutterP2pClient _newClient() =>
      (_clientFactory ?? () => FlutterP2pClient(username: username))();

  // --- policy --------------------------------------------------------------

  /// `base * 2^failures`, capped. Zero when there is nothing to back off from.
  ///
  /// Pure and public so the maths can be pinned by tests rather than inferred
  /// from timing.
  Duration backoffFor(int failures) {
    if (failures <= 0) return Duration.zero;
    // Clamp the shift before it runs: 2^63 is not a delay, it is an overflow.
    final int shift = failures > 16 ? 16 : failures;
    final int ms = _tuning.backoffBase.inMilliseconds * (1 << shift);
    final int capped =
        ms > _tuning.backoffCap.inMilliseconds ? _tuning.backoffCap.inMilliseconds : ms;
    return Duration(milliseconds: capped);
  }

  /// Registers a failure the manager could not see for itself — "the scan came
  /// back empty", "the host I wanted was not in range". Those are cycle-level
  /// judgements, but they must feed the same counters, or a radio that has
  /// gone deaf never trips the breaker.
  void noteFailure(String errorType) {
    _consecutiveFailures++;
    _lastFailureType = errorType;
    _backoffServed = false;
    _log('$errorType (consecutive: $_consecutiveFailures)', true);
    notifyListeners();
  }

  /// Clears the failure streak. Called internally on a successful connect.
  void noteSuccess() {
    if (_consecutiveFailures == 0 && _lastFailureType == null) return;
    _consecutiveFailures = 0;
    _lastFailureType = null;
    _backoffServed = false;
    notifyListeners();
  }

  // --- operations ----------------------------------------------------------

  /// Scans for hosts.
  ///
  /// Trips the circuit breaker first if the failure streak has reached the
  /// threshold, then waits out any cooldown and backoff. [isEnough] lets the
  /// caller stop the scan early once it has seen what it needs — discovery
  /// latency is part of the hop time, so burning the full window every time
  /// would inflate it.
  Future<OperationOutcome<List<BleDiscoveredDevice>>> scan({
    Duration? timeout,
    void Function(List<BleDiscoveredDevice> devices)? onDevices,
    bool Function(List<BleDiscoveredDevice> devices)? isEnough,
  }) async {
    if (!await _prepare('scan')) {
      return OperationOutcome<List<BleDiscoveredDevice>>.refused(
          'scan not allowed in ${_state.label}');
    }

    final FlutterP2pClient? client = _client;
    if (client == null) {
      return const OperationOutcome<List<BleDiscoveredDevice>>.refused(
          'no client — initialize() first');
    }

    _setState(MeshConnectionState.scanning);
    final Stopwatch watch = Stopwatch()..start();
    try {
      final List<BleDiscoveredDevice> found = await _watchdog(
        'scan',
        _tuning.scanWatchdog,
        () => _rawScan(
          client,
          timeout ?? _tuning.scanTimeout,
          onDevices,
          isEnough ?? (List<BleDiscoveredDevice> d) => d.isNotEmpty,
        ),
      );
      watch.stop();
      _setState(MeshConnectionState.idle, '${found.length} host(s) found');
      return OperationOutcome<List<BleDiscoveredDevice>>(
          value: found, duration: watch.elapsed);
    } catch (e) {
      watch.stop();
      return _failure<List<BleDiscoveredDevice>>('scan', e, watch.elapsed);
    }
  }

  /// Connects to [device].
  ///
  /// Refused — as a logged no-op, never a second concurrent attempt — unless
  /// the manager is idle.
  Future<OperationOutcome<void>> connect(
    BleDiscoveredDevice device, {
    Duration? timeout,
  }) async {
    if (!await _prepare('connect')) {
      return OperationOutcome<void>.refused(
          'connect not allowed in ${_state.label}');
    }

    final FlutterP2pClient? client = _client;
    if (client == null) {
      return const OperationOutcome<void>.refused(
          'no client — initialize() first');
    }

    _totalAttempts++;
    final String name =
        device.deviceName.isEmpty ? device.deviceAddress : device.deviceName;
    _setState(MeshConnectionState.connecting, name);

    final Stopwatch watch = Stopwatch()..start();
    try {
      await _watchdog(
        'connect',
        _tuning.connectWatchdog,
        () => client.connectWithDevice(
          device,
          timeout: timeout ?? _tuning.connectTimeout,
        ),
      );
      watch.stop();
      _totalSuccesses++;
      noteSuccess();
      _setState(MeshConnectionState.connected, name);

      // Before returning, so nothing the caller sends next can outrun a
      // re-bound stream.
      await onConnected?.call();

      return OperationOutcome<void>(duration: watch.elapsed);
    } catch (e) {
      watch.stop();
      return _failure<void>('connect', e, watch.elapsed);
    }
  }

  /// Tears the connection down. Safe to call repeatedly, from any state.
  Future<void> disconnect() async {
    if (_disposed) return;

    switch (_state) {
      case MeshConnectionState.idle:
      case MeshConnectionState.cooldown:
        _log('disconnect ignored — already ${_state.label}', false);
        return;
      case MeshConnectionState.disconnecting:
      case MeshConnectionState.recovering:
        _log('disconnect ignored — ${_state.label} in progress', false);
        return;
      case MeshConnectionState.scanning:
      case MeshConnectionState.connecting:
      case MeshConnectionState.connected:
        break;
    }

    final FlutterP2pClient? client = _client;
    _setState(MeshConnectionState.disconnecting);

    try {
      if (client != null) {
        await _watchdog('disconnect', _tuning.disconnectWatchdog, () async {
          await client.stopScan();
          await client.disconnect();
        });
      }
    } catch (e) {
      // A teardown that fails still has to end in cooldown — refusing to move
      // on is how a run wedges.
      final String type =
          e is WatchdogTimeout ? WatchdogTimeout.type : e.runtimeType.toString();
      _lastFailureType = type;
      _log('disconnect failed, continuing: $type: $e', true);
    }

    _enterCooldown('after disconnect');
  }

  /// Sends text over the current client. Reads [client] at call time so a
  /// recovery mid-run cannot leave this pointing at a disposed instance.
  Future<void> broadcastText(String text) async {
    final FlutterP2pClient? client = _client;
    if (client == null) {
      throw StateError('ConnectionManager has no client');
    }
    await client.broadcastText(text);
  }

  // --- internals -----------------------------------------------------------

  /// Everything that must happen before a scan or a connect may start:
  /// the circuit breaker, the state guard, the cooldown, then the backoff —
  /// in that order.
  ///
  /// Both operations share it deliberately. Cooldown exists because the radio
  /// needs time after a teardown, and that is no less true of connecting than
  /// of scanning; and putting the breaker on both means it fires whichever way
  /// the caller drives the manager, manual taps included.
  ///
  /// Returns false if the operation is not allowed, having logged why.
  Future<bool> _prepare(String operation) async {
    if (_consecutiveFailures >= _tuning.failureThreshold) {
      await _recover();
    }

    // idle is the resting state; cooldown is a timed one, so it is waited out
    // rather than refused. Everything else means something is already in
    // flight, and that is what must never be allowed to overlap.
    const Set<MeshConnectionState> allowed = <MeshConnectionState>{
      MeshConnectionState.idle,
      MeshConnectionState.cooldown,
    };
    if (!allowed.contains(_state)) {
      _log('$operation refused in ${_state.label}', true);
      return false;
    }

    await _awaitCooldown();
    await _awaitBackoff();
    if (_disposed) return false;

    // Another operation may have started while we waited.
    if (!allowed.contains(_state)) {
      _log('$operation refused in ${_state.label} after waiting', true);
      return false;
    }
    return true;
  }

  Future<T> _watchdog<T>(
    String operation,
    Duration ceiling,
    Future<T> Function() body,
  ) {
    return body().timeout(
      ceiling,
      onTimeout: () => throw WatchdogTimeout(operation, ceiling),
    );
  }

  Future<List<BleDiscoveredDevice>> _rawScan(
    FlutterP2pClient client,
    Duration timeout,
    void Function(List<BleDiscoveredDevice> devices)? onDevices,
    bool Function(List<BleDiscoveredDevice> devices) isEnough,
  ) async {
    final Completer<List<BleDiscoveredDevice>> completer =
        Completer<List<BleDiscoveredDevice>>();
    final List<BleDiscoveredDevice> seen = <BleDiscoveredDevice>[];

    void finish() {
      if (!completer.isCompleted) {
        completer.complete(List<BleDiscoveredDevice>.of(seen));
      }
    }

    await client.startScan(
      (List<BleDiscoveredDevice> devices) {
        seen
          ..clear()
          ..addAll(devices);
        onDevices?.call(List<BleDiscoveredDevice>.of(seen));
        if (isEnough(seen)) finish();
      },
      onError: (Object e) {
        if (!completer.isCompleted) completer.completeError(e);
      },
      onDone: finish,
      timeout: timeout,
    );

    final List<BleDiscoveredDevice> found = await completer.future;
    await _safeStopScan(client);
    return found;
  }

  Future<void> _safeStopScan(FlutterP2pClient client) async {
    try {
      await client.stopScan();
    } catch (e) {
      _log('stopScan failed, continuing: ${e.runtimeType}', false);
    }
  }

  Future<OperationOutcome<T>> _failure<T>(
    String operation,
    Object error,
    Duration elapsed,
  ) async {
    final String type = error is WatchdogTimeout
        ? WatchdogTimeout.type
        : error.runtimeType.toString();

    _consecutiveFailures++;
    _lastFailureType = type;
    _backoffServed = false;
    _log('$operation failed: $type: $error '
        '(consecutive: $_consecutiveFailures)', true);

    // Best effort: put the radio down before backing off, so a half-open
    // connection is not left holding the group.
    final FlutterP2pClient? client = _client;
    if (client != null) {
      try {
        await _watchdog('release-after-$operation', _tuning.disconnectWatchdog,
            () async {
          await client.stopScan();
          await client.disconnect();
        });
      } catch (e) {
        _log('release after failed $operation did not complete: '
            '${e.runtimeType}', true);
      }
    }

    _enterCooldown('after failed $operation');

    return OperationOutcome<T>(
      duration: elapsed,
      errorType: type,
      errorMessage: error.toString(),
    );
  }

  void _enterCooldown(String reason) {
    if (_disposed) return;
    _cooldownTimer?.cancel();
    _cooldownUntil = DateTime.now().add(_tuning.cooldown);
    _setState(MeshConnectionState.cooldown, reason);
    _cooldownTimer = Timer(_tuning.cooldown, () {
      _cooldownTimer = null;
      _cooldownUntil = null;
      if (_state == MeshConnectionState.cooldown) {
        _setState(MeshConnectionState.idle, 'cooldown elapsed');
      }
    });
  }

  Future<void> _awaitCooldown() async {
    final DateTime? until = _cooldownUntil;
    if (until == null) return;
    final Duration remaining = until.difference(DateTime.now());
    if (remaining <= Duration.zero) return;
    _log('holding ${_fmt(remaining)} for cooldown', false);
    await Future<void>.delayed(remaining);
  }

  /// Waits out the backoff, once per failure.
  ///
  /// A retry is scan-then-connect, and both go through [_prepare]; without
  /// [_backoffServed] the caller would pay the delay twice for one retry.
  /// Reset by every new failure, so the next attempt pays the new, longer one.
  Future<void> _awaitBackoff() async {
    if (_backoffServed) return;
    final Duration delay = backoffFor(_consecutiveFailures);
    if (delay <= Duration.zero) return;
    _backoffServed = true;
    _log('backoff ${_fmt(delay)} after $_consecutiveFailures '
        'consecutive failure(s)', false);
    await Future<void>.delayed(delay);
  }

  /// Circuit breaker. Destroys the client and builds a new one.
  ///
  /// The failure streak is reset afterwards even if the rebuild failed —
  /// otherwise the very next scan would trip the breaker again and the manager
  /// would recover in a tight loop instead of trying. [recoveryCount] is what
  /// tells the operator this is happening repeatedly.
  Future<void> _recover() async {
    _setState(MeshConnectionState.recovering,
        '$_consecutiveFailures consecutive failures');
    _recoveryCount++;
    _log('HARD RECOVERY #$_recoveryCount — disposing client, '
        'pausing ${_tuning.recoveryPause.inSeconds}s', true);

    _cooldownTimer?.cancel();
    _cooldownTimer = null;
    _cooldownUntil = null;

    final FlutterP2pClient? old = _client;
    _client = null;
    if (old != null) {
      try {
        await old.dispose().timeout(_tuning.disconnectWatchdog);
      } catch (e) {
        _log('recovery: old client would not dispose (${e.runtimeType}), '
            'continuing', true);
      }
    }

    await Future<void>.delayed(_tuning.recoveryPause);
    if (_disposed) return;

    try {
      final FlutterP2pClient fresh = _newClient();
      await fresh.initialize().timeout(_tuning.connectWatchdog);
      if (_disposed) {
        unawaited(fresh.dispose());
        return;
      }
      _client = fresh;
      _consecutiveFailures = 0;
      _lastFailureType = null;
      _backoffServed = false;
      _setState(MeshConnectionState.idle, 'recovery complete');
      _log('recovery complete — fresh client ready', false);
      await onClientChanged?.call(fresh);
    } catch (e) {
      _consecutiveFailures = 0;
      _lastFailureType = 'RECOVERY_FAILED';
      _setState(MeshConnectionState.idle, 'recovery failed');
      _log('RECOVERY FAILED: ${e.runtimeType}: $e', true);
    }
  }

  void _setState(MeshConnectionState next, [String? reason]) {
    if (_state == next) return;
    final MeshConnectionState previous = _state;
    final Duration held = DateTime.now().difference(_stateSince);
    _state = next;
    _stateSince = DateTime.now();
    _log(
      '${previous.label} -> ${next.label}'
      '${reason == null ? '' : ' ($reason)'}'
      ' [${_fmt(held)} in ${previous.label}]',
      false,
    );
    if (!_disposed) notifyListeners();
  }

  void _log(String line, bool failure) => onLog?.call('[conn] $line', failure);

  static String _fmt(Duration d) =>
      '${(d.inMilliseconds / 1000).toStringAsFixed(1)}s';
}
