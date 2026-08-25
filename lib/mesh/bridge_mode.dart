import 'dart:async';
import 'dart:convert';

import 'package:flutter_p2p_connection/flutter_p2p_connection.dart';

import 'connection_manager.dart';
import 'device_identity.dart';
import 'message_store.dart';
import 'sync_protocol.dart';

/// What the bridge is doing, or what just happened.
enum BridgeEventKind {
  connecting,
  syncing,

  /// Finished a sync with a host; [BridgeEvent.messagesCarriedIn] and
  /// [BridgeEvent.messagesCarriedOut] say what moved.
  carried,

  /// A message that arrived from one host has reached a different one. This
  /// is a completed relay — the whole point of the feature.
  delivered,

  disconnected,
  failed,
}

/// One thing that happened during a hop.
class BridgeEvent {
  const BridgeEvent({
    required this.targetName,
    required this.kind,
    this.messagesCarriedIn = 0,
    this.messagesCarriedOut = 0,
    this.errorType,
    this.messageId,
    this.messageType,
    this.sourceHost,
    this.destinationHost,
    required this.at,
  });

  final String targetName;
  final BridgeEventKind kind;

  /// Gained from this host during the hop.
  final int messagesCarriedIn;

  /// Handed to this host during the hop.
  final int messagesCarriedOut;

  final String? errorType;

  // Set on [BridgeEventKind.delivered] only — the completed relay.
  final String? messageId;
  final String? messageType;
  final String? sourceHost;
  final String? destinationHost;

  final DateTime at;
}

/// A message that made it all the way across: picked up at one host, handed
/// to another.
class RelayRecord {
  const RelayRecord({
    required this.messageId,
    required this.messageType,
    required this.from,
    required this.to,
    required this.at,
  });

  final String messageId;
  final String messageType;
  final String from;
  final String to;
  final DateTime at;

  /// Short id, for the relay log.
  String get shortId => DeviceIdentity.shorten(messageId);

  /// `#A1B2C3D4: KRP-FIRE-04 → KRP-MED-02`
  String get summary => '#$shortId: $from → $to';
}

/// A relay node that carries messages between hosts that cannot see each
/// other.
///
/// Two hosts out of range of one another are each in range of a responder who
/// walks or drives between them. This cycles that responder's phone between
/// the hosts: connect, reconcile, disconnect, move on. Anything picked up at
/// one end is handed to the other on the next hop.
///
/// Mechanically this is the cycle tester's duty loop pointed at more than one
/// target, which is why the timings that tested clean on hardware are the
/// defaults here. Every connect, retry, backoff, cooldown and recovery
/// decision belongs to [ConnectionManager]; this class adds only the routing
/// and the bookkeeping.
///
/// ## How a relay is detected
///
/// [SyncProtocol] is used unmodified. It already takes a `send` callback for
/// the MSG frames it pushes in answer to a peer's digest, so wrapping that
/// callback reveals exactly which message ids leave, and the current target
/// says where they went. Incoming messages are detected by checking the store
/// for the id immediately before and after the frame is handled.
///
/// That gives exact provenance rather than an inference:
///
/// * a message that arrives while connected to A is tagged `carried in from A`
/// * when that same id is later pushed to B, and `B != A`, it is a relay
/// * each id counts once, however many times it is pushed afterwards
class BridgeMode {
  BridgeMode({
    required this.connection,
    required this.store,
    required this.protocol,
    this.syncSettle = const Duration(seconds: 6),
    this.settleDelay = const Duration(seconds: 5),
    this.onLog,
  });

  /// Minimum targets for a bridge to mean anything — with one host there is
  /// nowhere to carry to.
  static const int minimumTargets = 2;

  /// Most recent relays kept for the UI.
  static const int recentRelayLimit = 50;

  final ConnectionManager connection;
  final MessageStore store;
  final SyncProtocol protocol;

  final Duration syncSettle;
  final Duration settleDelay;
  final void Function(String line)? onLog;

  final StreamController<BridgeEvent> _events =
      StreamController<BridgeEvent>.broadcast();

  /// messageId -> name of the host it was picked up from.
  final Map<String, String> _carriedInFrom = <String, String>{};

  /// Ids already counted as relayed, so a message pushed on every subsequent
  /// hop is not counted again.
  final Set<String> _relayed = <String>{};

  final List<RelayRecord> _relays = <RelayRecord>[];
  final List<Duration> _hopDurations = <Duration>[];

  List<BleDiscoveredDevice> _targets = const <BleDiscoveredDevice>[];
  String? _currentTarget;
  BridgeEventKind? _currentKind;

  int _hopsAttempted = 0;
  int _hopsCompleted = 0;
  int _carriedOutThisHop = 0;

  bool _running = false;
  bool _stopRequested = false;
  Completer<void>? _finished;
  Timer? _sleepTimer;
  Completer<void>? _sleepCompleter;

  Stream<BridgeEvent> get events => _events.stream;

  bool get isRunning => _running;
  String? get currentTarget => _currentTarget;
  BridgeEventKind? get currentKind => _currentKind;
  List<BleDiscoveredDevice> get targets => _targets;

  int get hopsAttempted => _hopsAttempted;
  int get hopsCompleted => _hopsCompleted;

  /// The headline metric.
  int get relaysCompleted => _relays.length;

  /// Newest first.
  List<RelayRecord> get recentRelays =>
      _relays.reversed.take(recentRelayLimit).toList(growable: false);

  /// Mean time for one complete hop — connect, sync, disconnect. The number to
  /// point at on stage, measured from this run rather than claimed.
  Duration get meanHopDuration {
    if (_hopDurations.isEmpty) return Duration.zero;
    int micros = 0;
    for (final Duration d in _hopDurations) {
      micros += d.inMicroseconds;
    }
    return Duration(microseconds: micros ~/ _hopDurations.length);
  }

  /// `~9.4s per hop`, or `—` before there is anything measured.
  String get perHopLabel {
    if (_hopDurations.isEmpty) return '— per hop';
    return '~${(meanHopDuration.inMilliseconds / 1000).toStringAsFixed(1)}s '
        'per hop';
  }

  // --- lifecycle -----------------------------------------------------------

  /// Cycles between [targets] until [stop] is called.
  ///
  /// Throws [ArgumentError] if given fewer than [minimumTargets] — a bridge
  /// with one end is not a bridge.
  Future<void> start({required List<BleDiscoveredDevice> targets}) async {
    if (targets.length < minimumTargets) {
      throw ArgumentError.value(
        targets.length,
        'targets',
        'bridge mode needs at least $minimumTargets hosts to carry between',
      );
    }
    if (_running) return;

    _running = true;
    _stopRequested = false;
    _targets = List<BleDiscoveredDevice>.unmodifiable(targets);
    final Completer<void> finished = Completer<void>();
    _finished = finished;

    _log('bridge mode starting across ${targets.length} hosts: '
        '${targets.map(_nameOf).join(", ")}');

    try {
      // Start from a known state so hop 1 looks like hop N.
      await connection.disconnect();

      int index = 0;
      while (!_stopRequested) {
        final BleDiscoveredDevice target = _targets[index % _targets.length];
        index++;
        await _runHop(target);
        if (_stopRequested) break;
        await _sleep(settleDelay);
      }
    } finally {
      await connection.disconnect();
      _running = false;
      _currentTarget = null;
      _currentKind = null;
      _finished = null;
      if (!finished.isCompleted) finished.complete();
      _log('bridge mode stopped — $relaysCompleted relay(s) completed');
    }
  }

  /// Halts and returns once the radio is released.
  ///
  /// A connect already in flight cannot be cancelled, so this can take up to
  /// the manager's connect watchdog to return; it always returns disconnected.
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

  Future<void> dispose() async {
    await stop();
    if (!_events.isClosed) await _events.close();
  }

  // --- one hop -------------------------------------------------------------

  Future<void> _runHop(BleDiscoveredDevice target) async {
    final String name = _nameOf(target);
    final Stopwatch hop = Stopwatch()..start();
    _hopsAttempted++;
    _currentTarget = name;
    _carriedOutThisHop = 0;

    final int storeBefore = store.count;

    try {
      _emit(name, BridgeEventKind.connecting);

      final OperationOutcome<List<BleDiscoveredDevice>> scan =
          await connection.scan(
        isEnough: (List<BleDiscoveredDevice> found) =>
            _matchIn(found, target) != null,
      );
      if (scan.rejected || scan.errorType != null) {
        throw _HopFailure(
            scan.errorType ?? 'ScanRefused', scan.errorMessage ?? 'scan failed');
      }

      final BleDiscoveredDevice? found =
          _matchIn(scan.value ?? const <BleDiscoveredDevice>[], target);
      if (found == null) {
        // Expected on a real bridge: the far host is out of range while we are
        // standing at the near one. Report it, keep cycling.
        connection.noteFailure('OutOfRange');
        throw const _HopFailure('OutOfRange', 'host not in range this pass');
      }

      final OperationOutcome<void> connected = await connection.connect(found);
      if (!connected.succeeded) {
        throw _HopFailure(connected.errorType ?? 'ConnectFailed',
            connected.errorMessage ?? 'connect failed');
      }

      _emit(name, BridgeEventKind.syncing);

      // Our digest invites the host to push what we lack; the host sends its
      // own on seeing us join, which is what pulls messages out of us.
      await _send(protocol.buildDigest(store));
      await _sleep(syncSettle);

      final int carriedIn = store.count - storeBefore;
      _hopsCompleted++;
      _emit(
        name,
        BridgeEventKind.carried,
        carriedIn: carriedIn,
        carriedOut: _carriedOutThisHop,
      );
      _log('$name: +$carriedIn in, $_carriedOutThisHop out');
    } on _HopFailure catch (e) {
      _emit(name, BridgeEventKind.failed, errorType: e.type);
      _log('$name: hop failed — ${e.type}: ${e.reason}');
    } catch (e) {
      _emit(name, BridgeEventKind.failed, errorType: e.runtimeType.toString());
      _log('$name: hop failed — ${e.runtimeType}: $e');
    } finally {
      await connection.disconnect();
      hop.stop();
      _hopDurations.add(hop.elapsed);
      _emit(name, BridgeEventKind.disconnected);
      _currentKind = null;
    }
  }

  // --- frame routing and provenance ----------------------------------------

  /// Routes one inbound frame, recording where anything new came from.
  ///
  /// The Mesh screen hands frames here instead of straight to [SyncProtocol]
  /// while the bridge is running, so provenance can be tracked without the
  /// protocol knowing anything about bridging.
  Future<void> handleFrame(String raw) async {
    final _FrameMessage? incoming = _messageOf(raw);
    final bool alreadyHeld =
        incoming != null && store.contains(incoming.id);

    await protocol.handleFrame(raw, store, _send, _log);

    if (incoming != null && !alreadyHeld && store.contains(incoming.id)) {
      _recordCarriedIn(incoming);
    }
  }

  /// Wraps the protocol's outbound sink. Every MSG frame that goes out is a
  /// message reaching the current host, which is what closes a relay.
  Future<void> _send(String raw) async {
    final _FrameMessage? outgoing = _messageOf(raw);
    await connection.broadcastText(raw);
    if (outgoing != null) _recordCarriedOut(outgoing);
  }

  void _recordCarriedIn(_FrameMessage message) {
    final String? host = _currentTarget;
    if (host == null) return;
    // First arrival wins: if we already know where it came from, a later copy
    // from elsewhere does not rewrite its origin.
    _carriedInFrom.putIfAbsent(message.id, () => host);
  }

  void _recordCarriedOut(_FrameMessage message) {
    final String? host = _currentTarget;
    if (host == null) return;

    _carriedOutThisHop++;

    final String? from = _carriedInFrom[message.id];
    // Not a relay if we never carried it (we originated it), if it is going
    // back where it came from, or if it has already been counted.
    if (from == null || from == host || _relayed.contains(message.id)) return;

    _relayed.add(message.id);
    final RelayRecord record = RelayRecord(
      messageId: message.id,
      messageType: message.type,
      from: from,
      to: host,
      at: DateTime.now(),
    );
    _relays.add(record);

    _log('RELAY ${record.summary}');
    _emitEvent(BridgeEvent(
      targetName: host,
      kind: BridgeEventKind.delivered,
      messageId: message.id,
      messageType: message.type,
      sourceHost: from,
      destinationHost: host,
      at: record.at,
    ));
  }

  /// Extracts the id and type from a MSG frame, or null for anything else.
  static _FrameMessage? _messageOf(String raw) {
    Object? decoded;
    try {
      decoded = jsonDecode(raw);
    } on FormatException {
      return null;
    }
    if (decoded is! Map<String, dynamic>) return null;
    if (decoded['kind'] != SyncFrameKind.message) return null;

    final Object? body = decoded['message'];
    if (body is! Map<String, dynamic>) return null;
    final Object? id = body['id'];
    if (id is! String || id.isEmpty) return null;

    return _FrameMessage(id, body['type'] as String? ?? 'UNKNOWN');
  }

  // --- helpers -------------------------------------------------------------

  static String _nameOf(BleDiscoveredDevice device) =>
      device.deviceName.isEmpty ? device.deviceAddress : device.deviceName;

  /// Finds [target] in a scan result by address, so the freshly discovered
  /// instance is the one handed to the manager.
  static BleDiscoveredDevice? _matchIn(
    List<BleDiscoveredDevice> found,
    BleDiscoveredDevice target,
  ) {
    for (final BleDiscoveredDevice d in found) {
      if (d.deviceAddress == target.deviceAddress) return d;
    }
    return null;
  }

  void _emit(
    String target,
    BridgeEventKind kind, {
    int carriedIn = 0,
    int carriedOut = 0,
    String? errorType,
  }) {
    _currentKind = kind;
    _emitEvent(BridgeEvent(
      targetName: target,
      kind: kind,
      messagesCarriedIn: carriedIn,
      messagesCarriedOut: carriedOut,
      errorType: errorType,
      at: DateTime.now(),
    ));
  }

  void _emitEvent(BridgeEvent event) {
    if (!_events.isClosed) _events.add(event);
  }

  void _log(String line) => onLog?.call(line);

  /// A delay [stop] can cut short, so pressing Stop during a settle does not
  /// leave the operator waiting.
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

/// Id and type lifted out of a MSG frame.
class _FrameMessage {
  const _FrameMessage(this.id, this.type);
  final String id;
  final String type;
}

/// Internal: a hop step that failed for a named reason.
class _HopFailure implements Exception {
  const _HopFailure(this.type, this.reason);
  final String type;
  final String reason;
  @override
  String toString() => '$type: $reason';
}
