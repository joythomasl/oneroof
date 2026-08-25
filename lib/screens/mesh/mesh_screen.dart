import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_p2p_connection/flutter_p2p_connection.dart';

import '../../mesh/bridge_mode.dart';
import '../../mesh/connection_manager.dart';
import '../../mesh/device_identity.dart';
import '../../mesh/mesh_message.dart';
import '../../mesh/message_store.dart';
import '../../mesh/report_store.dart';
import '../../mesh/sync_protocol.dart';
import '../../theme/app_theme.dart';
import 'bridge_screen.dart';
import 'cycle_test_screen.dart';

/// Which side of the P2P group this device is playing.
enum _MeshRole { none, host, client }

/// How a sync-log line should be rendered.
enum _LogKind { system, protocol, warn, error }

/// One line in the on-screen sync log.
class _LogEntry {
  _LogEntry(this.text, this.kind) : at = DateTime.now();

  final String text;
  final _LogKind kind;
  final DateTime at;

  String get stamp {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(at.hour)}:${two(at.minute)}:${two(at.second)}';
  }
}

typedef _Check = Future<bool> Function();

/// The permission and service-enable calls needed before any P2P work.
///
/// [FlutterP2pHost] and [FlutterP2pClient] inherit these methods from a shared
/// base class, but the package does not export that base type — so instead of
/// duplicating the whole permission flow per role we bundle the method
/// references and run one flow over them.
///
/// Field names mirror the plugin's method names exactly, because they are what
/// gets printed into the sync log — a line reading `checkLocationEnabled =
/// false` should be greppable straight back to the API that produced it.
class _P2pGate {
  const _P2pGate({
    required this.checkP2pPermissions,
    required this.askP2pPermissions,
    required this.checkBluetoothPermissions,
    required this.askBluetoothPermissions,
    required this.checkStoragePermission,
    required this.askStoragePermission,
    required this.checkWifiEnabled,
    required this.enableWifiServices,
    required this.checkLocationEnabled,
    required this.enableLocationServices,
    required this.checkBluetoothEnabled,
    required this.enableBluetoothServices,
  });

  factory _P2pGate.host(FlutterP2pHost host) => _P2pGate(
    checkP2pPermissions: host.checkP2pPermissions,
    askP2pPermissions: host.askP2pPermissions,
    checkBluetoothPermissions: host.checkBluetoothPermissions,
    askBluetoothPermissions: host.askBluetoothPermissions,
    checkStoragePermission: host.checkStoragePermission,
    askStoragePermission: host.askStoragePermission,
    checkWifiEnabled: host.checkWifiEnabled,
    enableWifiServices: host.enableWifiServices,
    checkLocationEnabled: host.checkLocationEnabled,
    enableLocationServices: host.enableLocationServices,
    checkBluetoothEnabled: host.checkBluetoothEnabled,
    enableBluetoothServices: host.enableBluetoothServices,
  );

  factory _P2pGate.client(FlutterP2pClient client) => _P2pGate(
    checkP2pPermissions: client.checkP2pPermissions,
    askP2pPermissions: client.askP2pPermissions,
    checkBluetoothPermissions: client.checkBluetoothPermissions,
    askBluetoothPermissions: client.askBluetoothPermissions,
    checkStoragePermission: client.checkStoragePermission,
    askStoragePermission: client.askStoragePermission,
    checkWifiEnabled: client.checkWifiEnabled,
    enableWifiServices: client.enableWifiServices,
    checkLocationEnabled: client.checkLocationEnabled,
    enableLocationServices: client.enableLocationServices,
    checkBluetoothEnabled: client.checkBluetoothEnabled,
    enableBluetoothServices: client.enableBluetoothServices,
  );

  final _Check checkP2pPermissions;
  final _Check askP2pPermissions;
  final _Check checkBluetoothPermissions;
  final _Check askBluetoothPermissions;
  final _Check checkStoragePermission;
  final _Check askStoragePermission;
  final _Check checkWifiEnabled;
  final _Check enableWifiServices;
  final _Check checkLocationEnabled;
  final _Check enableLocationServices;
  final _Check checkBluetoothEnabled;
  final _Check enableBluetoothServices;

  /// The six read-only checks, in checklist order. Used by "Diagnose", which
  /// must never prompt.
  Map<String, _Check> get readOnlyChecks => <String, _Check>{
    'checkP2pPermissions': checkP2pPermissions,
    'checkBluetoothPermissions': checkBluetoothPermissions,
    'checkStoragePermission': checkStoragePermission,
    'checkWifiEnabled': checkWifiEnabled,
    'checkLocationEnabled': checkLocationEnabled,
    'checkBluetoothEnabled': checkBluetoothEnabled,
  };
}

/// Offline mesh tab.
///
/// This is the fallback comms path: when cell and Wi-Fi backhaul are down,
/// responders in line of sight form a Wi-Fi Direct group (one host, many
/// clients, discovered over BLE) and reconcile their message stores over it.
///
/// The connection layer below (permissions, group creation, BLE scan,
/// connect) is unchanged from the plain-text version. Everything to do with
/// messages rides on top of `broadcastText()` as JSON sync frames — see
/// `lib/mesh/sync_protocol.dart` for the algorithm.
class MeshScreen extends StatefulWidget {
  const MeshScreen({super.key});

  @override
  State<MeshScreen> createState() => _MeshScreenState();
}

class _MeshScreenState extends State<MeshScreen> {
  /// Name this device advertises to the group.
  // TODO(backend): use the signed-in responder's call sign / unit id instead
  // of a constant, so peers in the client list are identifiable.
  static const String _callSign = 'DELTA-12';

  /// Sync log is capped so a long demo cannot grow it without bound.
  static const int _maxLogLines = 500;

  /// Compact style for the two secondary actions in a section header, so both
  /// fit on a narrow phone. Still 48dp tall — the Material minimum.
  static final ButtonStyle _headerButtonStyle = TextButton.styleFrom(
    minimumSize: const Size(48, 48),
    padding: const EdgeInsets.symmetric(horizontal: 10),
    textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
  );

  // --- connection state (unchanged behaviour) ---
  _MeshRole _role = _MeshRole.none;
  FlutterP2pHost? _host;

  /// Owns the client-side connection lifecycle: state guards, cooldown,
  /// backoff, watchdogs and hard recovery. The Mesh screen's manual controls
  /// and the cycle-test harness drive this same instance, so there is only one
  /// connection path that can be wrong.
  ConnectionManager? _connection;

  /// Long-lived client streams. Re-created whenever the manager builds a new
  /// client, which a hard recovery does.
  StreamSubscription<HotspotClientState>? _hotspotSub;
  StreamSubscription<List<P2pClientInfo>>? _peerSub;

  /// Current client, or null before joining. Never cached across an await — a
  /// hard recovery replaces the instance underneath us.
  FlutterP2pClient? get _client => _connection?.client;

  final List<StreamSubscription<dynamic>> _subs =
      <StreamSubscription<dynamic>>[];

  /// Kept out of [_subs] because it is torn down and re-created on every
  /// reconnect, while the others live for the whole session.
  StreamSubscription<String>? _textSub;

  /// Host-side traffic generator, so a cycling client has something new to
  /// collect on each pass.
  Timer? _autoGenerateTimer;
  bool _autoGenerate = false;
  int _autoGenerateSeconds = 10;
  final List<_LogEntry> _log = <_LogEntry>[];
  final List<BleDiscoveredDevice> _devices = <BleDiscoveredDevice>[];
  List<P2pClientInfo> _peers = const <P2pClientInfo>[];

  HotspotHostState? _hostState;
  HotspotClientState? _clientState;

  bool _busy = false;
  bool _scanning = false;
  bool _diagnosing = false;
  String? _statusLine;

  /// Why the last host/join attempt was abandoned, shown as a banner until the
  /// responder dismisses it or starts another attempt. The sync log keeps the
  /// detail; this is the part you can read from arm's length.
  String? _blockedReason;

  final ScrollController _logScroll = ScrollController();

  // --- mesh state ---
  // Shared with Home/Create Request: reports queued there join the next mesh
  // anti-entropy exchange without needing a separate import path.
  final MessageStore _store = reportStore;
  final SyncProtocol _sync = const SyncProtocol();

  /// Relay node built on the same ConnectionManager. Created with the
  /// connection so its provenance tracking is live from the first frame.
  BridgeMode? _bridge;
  MeshMessageType _draftType = MeshMessageType.incidentReport;

  /// Inbound frames are handled strictly in arrival order.
  ///
  /// `streamReceivedTexts()` can deliver several frames back to back, and
  /// handling a DIGEST is asynchronous (it awaits a send per pushed message).
  /// Chaining onto this future stops two frames interleaving their sends,
  /// which keeps the demo log readable and makes behaviour reproducible
  /// against the browser simulation.
  Future<void> _frameQueue = Future<void>.value();

  /// True once the group is actually usable for sending frames.
  bool get _isLive => switch (_role) {
    _MeshRole.host => _host?.isGroupCreated ?? false,
    _MeshRole.client => _connection?.isConnected ?? false,
    _MeshRole.none => false,
  };

  @override
  void dispose() {
    _autoGenerateTimer?.cancel();
    _autoGenerateTimer = null;
    unawaited(_textSub?.cancel());
    _textSub = null;
    for (final StreamSubscription<dynamic> sub in _subs) {
      unawaited(sub.cancel());
    }
    _subs.clear();

    unawaited(_hotspotSub?.cancel());
    unawaited(_peerSub?.cancel());
    _hotspotSub = null;
    _peerSub = null;

    // Releasing the native BLE/Wi-Fi Direct resources is mandatory — leaving a
    // group advertising after the screen is gone drains the battery and blocks
    // the next session from creating one.
    final FlutterP2pHost? host = _host;
    if (host != null) unawaited(host.dispose());
    _host = null;

    final BridgeMode? bridge = _bridge;
    _bridge = null;
    if (bridge != null) unawaited(bridge.dispose());

    // The manager owns the client, so disposing it disposes the client too.
    final ConnectionManager? connection = _connection;
    _connection = null;
    if (connection != null) {
      connection.removeListener(_onConnectionChanged);
      connection.dispose();
    }

    // `reportStore` is app-wide; Home and Create Request may queue a report
    // while this tab is not mounted, so it must outlive an individual screen.
    _logScroll.dispose();
    super.dispose();
  }

  // --- logging -------------------------------------------------------------

  void _addLog(String text, [_LogKind kind = _LogKind.system]) {
    if (!mounted) return;
    setState(() {
      _log.add(_LogEntry(text, kind));
      if (_log.length > _maxLogLines) {
        _log.removeRange(0, _log.length - _maxLogLines);
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_logScroll.hasClients) return;
      _logScroll.animateTo(
        _logScroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
      );
    });
  }

  void _setStatus(String? status) {
    if (!mounted) return;
    setState(() => _statusLine = status);
  }

  // --- permissions ---------------------------------------------------------

  /// How long to wait after an `enable*Services()` call before re-checking.
  ///
  /// Those methods launch a system settings page and return immediately, so a
  /// re-check in the same instant races the user and reads the old value. Two
  /// seconds is enough for a toggle flip and the trip back.
  static const Duration _settleAfterPrompt = Duration(seconds: 2);

  void _gateLog(String line, [_LogKind kind = _LogKind.protocol]) =>
      _addLog('[gate] $line', kind);

  /// Logs one gate's state, prompts if it is unsatisfied, then logs it again.
  ///
  /// Returns the value of the check *after* any prompt, so the caller decides
  /// whether an unsatisfied gate is fatal. Never throws: a gate that blows up
  /// is logged and reported as false.
  Future<bool> _runGate({
    required String checkName,
    required _Check check,
    required String actionName,
    required _Check action,
    Duration settle = Duration.zero,
  }) async {
    bool before;
    try {
      before = await check();
    } catch (e) {
      _gateLog('$checkName threw: ${e.runtimeType}: $e', _LogKind.error);
      return false;
    }
    _gateLog(
      '$checkName = $before',
      before ? _LogKind.protocol : _LogKind.warn,
    );
    if (before) return true;

    _gateLog('calling $actionName...');
    try {
      await action();
    } catch (e) {
      _gateLog('$actionName threw: ${e.runtimeType}: $e', _LogKind.error);
    }

    if (settle > Duration.zero) {
      _gateLog('waiting ${settle.inSeconds}s for the user to return...');
      await Future<void>.delayed(settle);
    }
    if (!mounted) return false;

    bool after;
    try {
      after = await check();
    } catch (e) {
      _gateLog('$checkName threw: ${e.runtimeType}: $e', _LogKind.error);
      return false;
    }
    _gateLog(
      '$checkName = $after (after)',
      after ? _LogKind.protocol : _LogKind.warn,
    );
    return after;
  }

  /// Records a gate that could not be satisfied, and puts a banner on screen.
  /// Always returns false so callers can `return _blockedBy(...)`.
  bool _blockedBy(String checkName, String message) {
    _gateLog('BLOCKED: $checkName still false after prompt', _LogKind.error);
    if (mounted) setState(() => _blockedReason = message);
    return false;
  }

  /// Runs the full permission + radio checklist, narrating every step into the
  /// sync log. Returns `false` as soon as a gate the mesh cannot work without
  /// stays unsatisfied after prompting.
  Future<bool> _ensurePermissions(_P2pGate gate) async {
    _setStatus('Checking permissions…');
    _gateLog('--- checklist start ---');

    if (!await _runGate(
      checkName: 'checkP2pPermissions',
      check: gate.checkP2pPermissions,
      actionName: 'askP2pPermissions',
      action: gate.askP2pPermissions,
    )) {
      return _blockedBy(
        'checkP2pPermissions',
        'Wi-Fi Direct permission was refused. Grant it in Settings › Apps › '
            'Samanvay Responder › Permissions, then try again.',
      );
    }

    if (!await _runGate(
      checkName: 'checkBluetoothPermissions',
      check: gate.checkBluetoothPermissions,
      actionName: 'askBluetoothPermissions',
      action: gate.askBluetoothPermissions,
    )) {
      return _blockedBy(
        'checkBluetoothPermissions',
        'Bluetooth permission was refused. Discovery needs BLE, so the mesh '
            'cannot start without it.',
      );
    }

    // Storage is only needed for file transfer, and on Android 13+ the legacy
    // storage permission is always reported as denied. Logged, never fatal —
    // blocking on it would make the mesh unusable on the test devices.
    if (!await _runGate(
      checkName: 'checkStoragePermission',
      check: gate.checkStoragePermission,
      actionName: 'askStoragePermission',
      action: gate.askStoragePermission,
    )) {
      _gateLog(
        'storage unavailable — file transfer disabled (not fatal)',
        _LogKind.warn,
      );
    }

    _setStatus('Checking radios…');

    if (!await _runGate(
      checkName: 'checkWifiEnabled',
      check: gate.checkWifiEnabled,
      actionName: 'enableWifiServices',
      action: gate.enableWifiServices,
      settle: _settleAfterPrompt,
    )) {
      return _blockedBy(
        'checkWifiEnabled',
        'Wi-Fi is still off. Turn it on, then try again.',
      );
    }

    if (!await _runGate(
      checkName: 'checkLocationEnabled',
      check: gate.checkLocationEnabled,
      actionName: 'enableLocationServices',
      action: gate.enableLocationServices,
      settle: _settleAfterPrompt,
    )) {
      return _blockedBy(
        'checkLocationEnabled',
        'Location services are still off. Android will not scan for peers '
            'without them.',
      );
    }

    if (!await _runGate(
      checkName: 'checkBluetoothEnabled',
      check: gate.checkBluetoothEnabled,
      actionName: 'enableBluetoothServices',
      action: gate.enableBluetoothServices,
      settle: _settleAfterPrompt,
    )) {
      return _blockedBy(
        'checkBluetoothEnabled',
        'Bluetooth is still off. Turn it on, then try again.',
      );
    }

    _gateLog('--- checklist passed ---');
    return true;
  }

  // --- diagnostics ---------------------------------------------------------

  /// A gate for read-only checks.
  ///
  /// Prefers the live host/client so diagnostics report on the same instance
  /// the session uses. With nothing connected it builds a throwaway
  /// [FlutterP2pHost]: the plugin explicitly allows all six checks before
  /// `initialize()` (the native side spins up minimal managers for them), and
  /// nothing native is allocated.
  ///
  /// The throwaway is deliberately NOT disposed — `FlutterP2pHost.dispose()`
  /// calls `removeGroup()` against the shared platform singleton, which would
  /// tear down a live session belonging to someone else.
  _P2pGate _diagnosticGate() {
    final FlutterP2pHost? host = _host;
    if (host != null) return _P2pGate.host(host);
    final FlutterP2pClient? client = _client;
    if (client != null) return _P2pGate.client(client);
    return _P2pGate.host(FlutterP2pHost(username: _callSign));
  }

  /// Reports all six gates without prompting for anything.
  ///
  /// Read-only on purpose: this is for seeing the true state of the device
  /// without a permission dialog changing it out from under you.
  Future<void> _runDiagnostics() async {
    if (_diagnosing) return;
    setState(() => _diagnosing = true);
    _gateLog('--- diagnostics (read-only, no prompts) ---');

    try {
      final _P2pGate gate = _diagnosticGate();
      int failing = 0;

      for (final MapEntry<String, _Check> entry
          in gate.readOnlyChecks.entries) {
        try {
          final bool value = await entry.value();
          if (!value) failing++;
          _gateLog(
            '${entry.key} = $value',
            value ? _LogKind.protocol : _LogKind.warn,
          );
        } catch (e) {
          failing++;
          _gateLog('${entry.key} threw: ${e.runtimeType}: $e', _LogKind.error);
        }
        if (!mounted) return;
      }

      _gateLog(
        failing == 0
            ? '--- diagnostics: all 6 gates OK ---'
            : '--- diagnostics: $failing of 6 gate(s) not satisfied ---',
        failing == 0 ? _LogKind.protocol : _LogKind.warn,
      );
    } finally {
      if (mounted) setState(() => _diagnosing = false);
    }
  }

  // --- host ----------------------------------------------------------------

  Future<void> _startHosting() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _role = _MeshRole.host;
      _blockedReason = null;
    });

    final FlutterP2pHost host = FlutterP2pHost(username: _callSign);
    _host = host;

    try {
      await host.initialize();
      _addLog('Host initialised as $_callSign.');

      if (!await _ensurePermissions(_P2pGate.host(host))) {
        await _teardown();
        return;
      }

      _setStatus('Creating group…');
      final HotspotHostState state;
      try {
        state = await host.createGroup(advertise: true);
      } catch (e) {
        // The usual causes are a TimeoutException (the hotspot never came up
        // with an IP) or a PlatformException from the Wi-Fi Direct stack. The
        // type is as diagnostic as the message, so log both.
        _addLog('! createGroup failed: ${e.runtimeType}: $e', _LogKind.error);
        if (mounted) {
          setState(
            () => _blockedReason =
                'Could not create the Wi-Fi Direct group. See the sync log for '
                'the exact error.',
          );
        }
        await _teardown();
        return;
      }
      if (!mounted) return;
      setState(() => _hostState = state);
      _addLog(
        'Group up — SSID ${state.ssid ?? "?"} '
        '(${state.hostIpAddress ?? "no ip"}). Advertising over BLE.',
      );

      _subs
        ..add(
          host.streamHotspotState().listen(
            (HotspotHostState s) {
              if (!mounted) return;
              setState(() => _hostState = s);
              if (!s.isActive) _addLog('Group went down.', _LogKind.error);
            },
            onError: (Object e) => _addLog('Hotspot error: $e', _LogKind.error),
          ),
        )
        ..add(
          host.streamClientList().listen(
            _onClientListChanged,
            onError: (Object e) =>
                _addLog('Client list error: $e', _LogKind.error),
          ),
        );
      _bindReceivedTexts();

      _setStatus(null);
    } catch (e) {
      _addLog('Could not start hosting: $e', _LogKind.error);
      await _teardown();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// A change in the group roster is the host's signal that a peer arrived.
  ///
  /// Counts only non-host entries: the roster includes the host itself, and
  /// its own arrival at group creation is not a peer joining.
  void _onClientListChanged(List<P2pClientInfo> clients) {
    if (!mounted) return;
    final int before = _peers.where((P2pClientInfo c) => !c.isHost).length;
    final int now = clients.where((P2pClientInfo c) => !c.isHost).length;
    setState(() => _peers = clients);

    if (now > before) {
      _addLog('peer joined — $now client(s) connected');
      // Settle before the first digest. A frame sent in the same instant the
      // roster changes can reach the transport before the new client's socket
      // is in the host's table, and would simply be dropped.
      Future<void>.delayed(const Duration(milliseconds: 400), () {
        if (!mounted) return;
        unawaited(_kickOffSync('peer joined'));
      });
    } else if (now < before) {
      _addLog('peer left — $now client(s) connected');
    }
  }

  // --- client --------------------------------------------------------------

  Future<void> _joinAsClient() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _role = _MeshRole.client;
      _blockedReason = null;
    });

    final ConnectionManager connection = ConnectionManager(
      username: _callSign,
      onLog: (String line, bool failure) =>
          _addLog(line, failure ? _LogKind.warn : _LogKind.protocol),
      // A hard recovery disposes the old client, so every stream taken from it
      // is dead. Re-bind them whenever the instance changes.
      onClientChanged: (FlutterP2pClient client) async => _bindClientStreams(),
      // Fires inside connect(), before it returns, so nothing sent afterwards
      // can outrun the re-bound text stream.
      onConnected: () async => _bindReceivedTexts(),
    );
    _connection = connection;
    connection.addListener(_onConnectionChanged);
    _bridge = BridgeMode(
      connection: connection,
      store: _store,
      protocol: _sync,
      onLog: (String line) => _addLog('[bridge] $line', _LogKind.protocol),
    );

    try {
      await connection.initialize();
      _addLog('Client initialised as $_callSign.');

      final FlutterP2pClient? client = connection.client;
      if (client == null) {
        _addLog('client failed to initialise', _LogKind.error);
        await _teardown();
        return;
      }

      if (!await _ensurePermissions(_P2pGate.client(client))) {
        await _teardown();
        return;
      }

      await _startScan();
      _setStatus(null);
    } catch (e) {
      _addLog('Could not join: $e', _LogKind.error);
      await _teardown();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _startScan() async {
    final ConnectionManager? connection = _connection;
    if (connection == null) return;

    setState(() {
      _devices.clear();
      _scanning = true;
    });
    _addLog('Scanning for nearby hosts…');

    // The manager applies cooldown and backoff first and bounds the scan with
    // its watchdog. onDevices drives the live list; the return value is final.
    final OperationOutcome<List<BleDiscoveredDevice>>
    outcome = await connection.scan(
      onDevices: (List<BleDiscoveredDevice> found) {
        if (!mounted) return;
        setState(() {
          _devices
            ..clear()
            ..addAll(found);
        });
      },
      // Manual use wants everything in range, so let the window run out rather
      // than stopping at the first host the way the cycle tester does.
      isEnough: (List<BleDiscoveredDevice> devices) => false,
    );

    if (!mounted) return;
    setState(() {
      _scanning = false;
      _devices
        ..clear()
        ..addAll(outcome.value ?? const <BleDiscoveredDevice>[]);
    });

    if (outcome.errorType != null) {
      _addLog('! scan failed: ${outcome.errorType}', _LogKind.error);
    }
  }

  Future<void> _connectTo(BleDiscoveredDevice device) async {
    final ConnectionManager? connection = _connection;
    if (connection == null || _busy) return;

    setState(() {
      _busy = true;
      _blockedReason = null;
      _scanning = false;
    });
    final String name = device.deviceName.isEmpty
        ? device.deviceAddress
        : device.deviceName;
    _setStatus('Connecting to $name…');

    try {
      // Guards, watchdog, backoff and failure bookkeeping are the manager's,
      // and _bindReceivedTexts has already run by the time this returns.
      final OperationOutcome<void> outcome = await connection.connect(device);

      if (!outcome.succeeded) {
        final String detail = outcome.rejected
            ? 'refused (${outcome.errorMessage})'
            : '${outcome.errorType}: ${outcome.errorMessage}';
        _addLog('! connect to $name failed — $detail', _LogKind.error);
        if (!mounted) return;
        setState(() {
          _blockedReason = outcome.errorType == WatchdogTimeout.type
              ? 'Connecting to $name hung and was aborted by the watchdog. '
                    'The manager is cooling the radio down before the next try.'
              : 'Could not connect to $name. See the sync log for the exact '
                    'error, or run Diagnose to check the radios.';
        });
        return;
      }

      _addLog('Connected to $name.');
      await _kickOffSync('connected');
    } finally {
      if (mounted) setState(() => _busy = false);
      _setStatus(null);
    }
  }

  void _onConnectionChanged() {
    if (!mounted) return;
    setState(() {});
  }

  /// Re-binds the client streams that outlive a connection but not the client
  /// instance. Called every time the manager produces a fresh client.
  void _bindClientStreams() {
    final FlutterP2pClient? client = _client;
    if (client == null) return;

    unawaited(_hotspotSub?.cancel());
    unawaited(_peerSub?.cancel());

    _hotspotSub = client.streamHotspotState().listen((HotspotClientState s) {
      if (!mounted) return;
      setState(() => _clientState = s);
    }, onError: (Object e) => _addLog('Hotspot error: $e', _LogKind.error));
    _peerSub = client.streamClientList().listen((List<P2pClientInfo> clients) {
      if (!mounted) return;
      setState(() => _peers = clients);
    }, onError: (Object e) => _addLog('Client list error: $e', _LogKind.error));
    _bindReceivedTexts();
  }

  // --- sync ----------------------------------------------------------------

  /// Puts one encoded frame on the wire.
  ///
  /// `broadcastText` reaches every other node in the group — the host relays a
  /// client's text on to the other clients — so one call is a full fan-out.
  Future<void> _sendFrame(String raw) async {
    switch (_role) {
      case _MeshRole.host:
        await _host?.broadcastText(raw);
      case _MeshRole.client:
        await _connection?.broadcastText(raw);
      case _MeshRole.none:
        return;
    }
  }

  /// (Re-)subscribes to the transport's received-text stream.
  ///
  /// This has to be callable more than once. `streamReceivedTexts()` binds to
  /// the transport's stream once via `yield*` and completes for good when
  /// `disconnect()` disposes that transport — so a subscription taken at join
  /// time is dead after the first disconnect, and every later reconnect would
  /// deliver nothing into the store. Anything that reconnects (the cycle
  /// tester, and any future auto-reconnect) must call this afterwards.
  ///
  /// Safe to call when the transport is not up yet: the plugin's generator
  /// polls until one exists, and the previous subscription is cancelled here
  /// so at most one is ever live.
  void _bindReceivedTexts() {
    unawaited(_textSub?.cancel());
    _textSub = null;

    final Stream<String>? texts = switch (_role) {
      _MeshRole.host => _host?.streamReceivedTexts(),
      _MeshRole.client => _client?.streamReceivedTexts(),
      _MeshRole.none => null,
    };
    if (texts == null) return;

    _textSub = texts.listen(
      _enqueueFrame,
      onError: (Object e) => _addLog('Receive error: $e', _LogKind.error),
    );
  }

  /// Queues one inbound frame for in-order handling.
  void _enqueueFrame(String raw) {
    _frameQueue = _frameQueue
        .then((_) async {
          // While bridging, the bridge routes frames so it can see which message
          // ids leave and to which host — that is how a completed relay is
          // detected. It calls the same SyncProtocol underneath; only the sink is
          // wrapped, so store and protocol behaviour are identical either way.
          final BridgeMode? bridge = _bridge;
          if (bridge != null && bridge.isRunning) {
            await bridge.handleFrame(raw);
            return;
          }
          await _sync.handleFrame(
            raw,
            _store,
            _sendFrame,
            (String line) => _addLog(line, _LogKind.protocol),
          );
        })
        .catchError((Object e) {
          _addLog('! frame handling failed: $e', _LogKind.error);
        });
  }

  /// Sends our DIGEST, which invites every peer to push what we are missing.
  ///
  /// DIGEST only pulls: it says "here is everything I hold". Both sides send
  /// one when a connection comes up, and that pair of digests is a complete
  /// bidirectional reconciliation.
  Future<void> _kickOffSync(String reason) async {
    if (!_isLive) return;
    try {
      await _sendFrame(_sync.buildDigest(_store));
      _addLog('> DIGEST ${_store.count} id(s) [$reason]', _LogKind.protocol);
    } catch (e) {
      _addLog('! DIGEST send failed: $e', _LogKind.error);
    }
  }

  Future<void> _syncNow() async {
    if (!_isLive) {
      _addLog('not connected — nothing to sync with');
      return;
    }
    await _kickOffSync('manual');
  }

  /// Turns the host-side traffic generator on or off.
  ///
  /// Without it a cycling client reconnects to a store that has not changed,
  /// so `messagesGained` is 0 every pass and proves nothing. With it, each
  /// cycle has something genuinely new to carry.
  void _setAutoGenerate({bool? enabled, int? seconds}) {
    setState(() {
      if (enabled != null) _autoGenerate = enabled;
      if (seconds != null) _autoGenerateSeconds = seconds;
    });

    _autoGenerateTimer?.cancel();
    _autoGenerateTimer = null;

    if (!_autoGenerate || _role != _MeshRole.host) {
      if (enabled == false) _addLog('auto-generate off');
      return;
    }

    _autoGenerateTimer = Timer.periodic(
      Duration(seconds: _autoGenerateSeconds),
      (_) {
        if (!mounted) return;
        unawaited(_createTestMessage(auto: true));
      },
    );
    _addLog(
      'auto-generate on — one ${_draftType.wireName} '
      'every ${_autoGenerateSeconds}s',
    );
  }

  /// Creates a message locally and pushes it straight out as a MSG frame.
  ///
  /// Works while disconnected on purpose: the message lands in the store and
  /// goes across at the next digest exchange. That is the store-and-forward
  /// behaviour this screen exists to demonstrate.
  Future<void> _createTestMessage({bool auto = false}) async {
    final MeshMessageType type = _draftType;
    final MeshMessage message = MeshMessage.create(
      type: type.wireName,
      originDevice: DeviceIdentity.deviceId,
      originUser: DeviceIdentity.userId,
      // TODO(backend): real payloads come from the incident form, the SOS
      // button and the duty-status control. This is filler for testing.
      payload: <String, dynamic>{
        'note': 'Test ${type.label} from ${DeviceIdentity.shortDeviceId}',
        'auto': auto,
      },
    );

    _store.add(message);
    _addLog(
      '${auto ? 'auto-created' : 'created'} ${message.type} '
      'p${message.priority} #${DeviceIdentity.shorten(message.id)}',
    );

    if (!_isLive) {
      _addLog('offline — held in store, will sync on next contact');
      return;
    }

    try {
      await _sendFrame(_sync.buildMessageFrame(message));
      _addLog(
        '> MSG #${DeviceIdentity.shorten(message.id)}',
        _LogKind.protocol,
      );
    } catch (e) {
      _addLog('! MSG send failed: $e', _LogKind.error);
    }
  }

  // --- bridge mode ---------------------------------------------------------

  /// Opens Bridge Mode: the relay node that carries messages between hosts
  /// that cannot see each other.
  ///
  /// Like the cycle tester it drives this screen's client, so it needs one —
  /// which only exists after "Join as client".
  Future<void> _openBridgeMode() async {
    final ConnectionManager? connection = _connection;
    final BridgeMode? bridge = _bridge;
    if (connection == null || bridge == null) {
      _addLog('bridge mode needs a client — tap "Join as client" first');
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text(
              'Tap "Join as client" first — bridge mode carries '
              'from the client side.',
            ),
          ),
        );
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (BuildContext context) => BridgeScreen(
          bridge: bridge,
          connection: connection,
          discovered: List<BleDiscoveredDevice>.of(_devices),
        ),
      ),
    );

    // The bridge leaves the radio disconnected, and a hard recovery during the
    // run would have swapped the client instance out from under our streams.
    if (!mounted) return;
    _bindClientStreams();
    _addLog(
      'returned from bridge mode — '
      '${bridge.relaysCompleted} relay(s) completed, ${bridge.perHopLabel}',
    );
  }

  // --- cycle test ----------------------------------------------------------

  /// Opens the cycle-test harness.
  ///
  /// It drives this screen's client through repeated connect/disconnect, so it
  /// needs one that has already been initialised — that only exists after
  /// "Join as client". Hosting cannot be cycle-tested from this side: the host
  /// is the fixed end of the pair.
  Future<void> _openCycleTest() async {
    final ConnectionManager? connection = _connection;
    if (connection == null) {
      _addLog('cycle test needs a client — tap "Join as client" first');
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text(
              'Tap "Join as client" first — the cycle test '
              'drives the client side.',
            ),
          ),
        );
      return;
    }

    // Hand over the hosts already discovered. One target repeats the same
    // host; several alternate round-robin with no other change.
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (BuildContext context) => CycleTestScreen(
          connection: connection,
          store: _store,
          protocol: _sync,
          knownTargets: List<BleDiscoveredDevice>.of(_devices),
        ),
      ),
    );

    // The tester leaves the radio disconnected. Re-bind defensively: if the
    // run ended in a hard recovery the client instance is a different object
    // from the one this screen last bound to.
    if (!mounted) return;
    _bindClientStreams();
    _addLog(
      'returned from cycle test — store holds ${_store.count} message(s)',
    );
  }

  // --- teardown ------------------------------------------------------------

  Future<void> _teardown() async {
    _autoGenerateTimer?.cancel();
    _autoGenerateTimer = null;
    await _textSub?.cancel();
    _textSub = null;
    await _hotspotSub?.cancel();
    _hotspotSub = null;
    await _peerSub?.cancel();
    _peerSub = null;
    for (final StreamSubscription<dynamic> sub in _subs) {
      await sub.cancel();
    }
    _subs.clear();

    final FlutterP2pHost? host = _host;
    _host = null;
    await host?.dispose();

    // Stop bridging before the radio goes, so the hop loop cannot outlive it.
    final BridgeMode? bridge = _bridge;
    _bridge = null;
    if (bridge != null) await bridge.dispose();

    // Disconnect through the manager first so the radio is released in the
    // guarded, watchdogged path rather than by a bare dispose.
    final ConnectionManager? connection = _connection;
    _connection = null;
    if (connection != null) {
      connection.removeListener(_onConnectionChanged);
      await connection.disconnect();
      connection.dispose();
    }

    if (!mounted) return;
    setState(() {
      _role = _MeshRole.none;
      _devices.clear();
      _peers = const <P2pClientInfo>[];
      _hostState = null;
      _clientState = null;
      _scanning = false;
      _statusLine = null;
      _busy = false;
      _autoGenerate = false;
    });
    // The store deliberately survives: messages outlive connections.
    _addLog('left the mesh — ${_store.count} message(s) retained');
  }

  // --- build ---------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: <Widget>[
            const Text('Mesh'),
            const SizedBox(width: 10),
            // Device id, so three test phones can be told apart at a glance.
            StatusBadge(
              label: DeviceIdentity.shortDeviceId,
              color: AppColors.info,
              icon: Icons.smartphone,
              dense: true,
            ),
          ],
        ),
        actions: <Widget>[
          IconButton(
            iconSize: 26,
            tooltip: 'Bridge mode',
            icon: const Icon(Icons.swap_horiz),
            onPressed: _busy ? null : _openBridgeMode,
          ),
          IconButton(
            iconSize: 26,
            tooltip: 'Cycle test',
            icon: const Icon(Icons.loop),
            onPressed: _busy ? null : _openCycleTest,
          ),
          if (_role != _MeshRole.none)
            IconButton(
              iconSize: 28,
              tooltip: 'Leave mesh',
              icon: const Icon(Icons.link_off),
              onPressed: _busy ? null : _teardown,
            ),
          const SizedBox(width: 4),
        ],
      ),
      body: SafeArea(
        top: false,
        // Rebuilds whenever the store changes, so both the Store section and
        // its counter follow message arrivals without manual plumbing.
        child: ListenableBuilder(
          listenable: _store,
          builder: (BuildContext context, Widget? _) => _buildBody(),
        ),
      ),
    );
  }

  Widget _buildBody() {
    final bool showDevices =
        _role == _MeshRole.client &&
        !_isLive &&
        (_scanning || _devices.isNotEmpty);

    return Column(
      children: <Widget>[
        if (_role == _MeshRole.none)
          _buildConnectStrip()
        else
          _buildSessionHeader(),
        if (_statusLine != null)
          const LinearProgressIndicator(
            minHeight: 3,
            backgroundColor: AppColors.surfaceVariant,
          ),
        if (_connection != null) _buildHealthStrip(_connection!),
        if (_blockedReason != null) _buildBlockedBanner(_blockedReason!),
        if (showDevices) ...<Widget>[
          _buildDeviceList(),
          const Divider(height: 1),
        ],
        Expanded(flex: 5, child: _buildStoreSection()),
        const Divider(height: 1),
        Expanded(flex: 4, child: _buildLogSection()),
        _buildComposer(),
      ],
    );
  }

  /// Radio health at a glance: what the state machine is doing, how many
  /// failures have stacked up, and how many times it has had to rebuild the
  /// client. A climbing failure or recovery count is the degradation signal.
  Widget _buildHealthStrip(ConnectionManager connection) {
    final TextTheme text = Theme.of(context).textTheme;
    final ConnectionHealth health = connection.health;

    final Color stateColor = switch (health.state) {
      MeshConnectionState.connected => AppColors.p3,
      MeshConnectionState.recovering => AppColors.p0,
      MeshConnectionState.cooldown => AppColors.p2,
      MeshConnectionState.scanning ||
      MeshConnectionState.connecting ||
      MeshConnectionState.disconnecting => AppColors.info,
      MeshConnectionState.idle => AppColors.textSecondary,
    };

    final bool failing = health.consecutiveFailures > 0;
    final bool recovered = health.recoveryCount > 0;

    return Container(
      width: double.infinity,
      color: AppColors.background,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Row(
        children: <Widget>[
          StatusBadge(
            label: health.state.label,
            color: stateColor,
            dense: true,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              '${health.totalSuccesses}/${health.totalAttempts} connects',
              style: text.bodySmall,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          _HealthCounter(
            icon: Icons.error_outline,
            value: health.consecutiveFailures,
            color: failing ? AppColors.p1 : AppColors.textSecondary,
            tooltip: 'Consecutive failures',
          ),
          const SizedBox(width: 12),
          _HealthCounter(
            icon: Icons.restart_alt,
            value: health.recoveryCount,
            color: recovered ? AppColors.p0 : AppColors.textSecondary,
            tooltip: 'Hard recoveries',
          ),
        ],
      ),
    );
  }

  /// Why the last attempt stopped, in plain language. Stays up until it is
  /// dismissed or another attempt starts — a snackbar would be gone before
  /// someone looking at the phone had read it.
  Widget _buildBlockedBanner(String reason) {
    final TextTheme text = Theme.of(context).textTheme;
    return Container(
      width: double.infinity,
      color: AppColors.p0.withValues(alpha: 0.14),
      padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Icon(Icons.block, color: AppColors.p0, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'Blocked',
                  style: text.titleMedium?.copyWith(color: AppColors.p0),
                ),
                const SizedBox(height: 4),
                Text(reason, style: text.bodyMedium),
              ],
            ),
          ),
          IconButton(
            iconSize: 22,
            tooltip: 'Dismiss',
            icon: const Icon(Icons.close, color: AppColors.textSecondary),
            onPressed: () => setState(() => _blockedReason = null),
          ),
        ],
      ),
    );
  }

  Widget _buildConnectStrip() {
    final TextTheme text = Theme.of(context).textTheme;
    return Container(
      width: double.infinity,
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              const Icon(
                Icons.wifi_tethering_off,
                size: 20,
                color: AppColors.textSecondary,
              ),
              const SizedBox(width: 10),
              Text('Not on a mesh', style: text.titleMedium),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'One responder hosts, everyone else joins. Messages created now '
            'are held and sync on contact.',
            style: text.bodySmall,
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: _busy ? null : _startHosting,
            icon: const Icon(Icons.podcasts),
            label: const Text('Start hosting'),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: _busy ? null : _joinAsClient,
            icon: const Icon(Icons.travel_explore),
            label: const Text('Join as client'),
          ),
        ],
      ),
    );
  }

  Widget _buildSessionHeader() {
    final TextTheme text = Theme.of(context).textTheme;
    final bool isHost = _role == _MeshRole.host;
    final String roleLabel = isHost ? 'HOSTING' : 'CLIENT';
    final String stateLabel = _isLive ? 'CONNECTED' : 'CONNECTING';
    final Color stateColor = _isLive ? AppColors.p3 : AppColors.p1;

    final String detail;
    if (isHost) {
      final HotspotHostState? s = _hostState;
      detail = s == null
          ? 'Starting group…'
          : 'SSID ${s.ssid ?? "?"}  ·  key ${s.preSharedKey ?? "?"}';
    } else {
      final HotspotClientState? s = _clientState;
      detail = s == null || !s.isActive
          ? 'Not attached to a group yet'
          : 'On ${s.hostSsid ?? "?"}  ·  host ${s.hostGatewayIpAddress ?? "?"}';
    }

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
                label: roleLabel,
                color: isHost ? AppColors.info : AppColors.textPrimary,
                icon: isHost ? Icons.podcasts : Icons.smartphone,
                dense: true,
              ),
              const SizedBox(width: 8),
              StatusBadge(label: stateLabel, color: stateColor, dense: true),
              const Spacer(),
              const Icon(
                Icons.group_outlined,
                size: 20,
                color: AppColors.textSecondary,
              ),
              const SizedBox(width: 6),
              Text('${_peers.length}', style: text.titleMedium),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            _statusLine ?? detail,
            style: text.bodySmall,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildDeviceList() {
    final TextTheme text = Theme.of(context).textTheme;
    return Container(
      constraints: const BoxConstraints(maxHeight: 230),
      color: AppColors.background,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 8, 2),
            child: Row(
              children: <Widget>[
                Text(
                  _scanning ? 'SCANNING…' : 'NEARBY HOSTS',
                  style: text.bodySmall?.copyWith(letterSpacing: 1.2),
                ),
                const Spacer(),
                TextButton.icon(
                  onPressed: _busy || _scanning ? null : _startScan,
                  icon: const Icon(Icons.refresh, size: 20),
                  label: const Text('Rescan'),
                ),
              ],
            ),
          ),
          Flexible(
            child: _devices.isEmpty
                ? Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    child: Text(
                      _scanning
                          ? 'Looking for advertising hosts…'
                          : 'No hosts found. Ask someone nearby to start '
                                'hosting, then rescan.',
                      style: text.bodySmall,
                    ),
                  )
                // ListTile builds no Material of its own — it inks onto the
                // nearest ancestor one, which here is the Scaffold's, below
                // this Container's opaque colour. The tap splash would be
                // painted over and never seen. A transparent Material sits
                // above the colour, so the splash shows and the Container's
                // own background still reads through.
                : Material(
                    type: MaterialType.transparency,
                    child: ListView.separated(
                      shrinkWrap: true,
                      padding: const EdgeInsets.only(bottom: 8),
                      itemCount: _devices.length,
                      separatorBuilder: (_, _) => const Divider(height: 1),
                      itemBuilder: (BuildContext context, int i) {
                        final BleDiscoveredDevice d = _devices[i];
                        return ListTile(
                          leading: const Icon(Icons.podcasts, size: 28),
                          title: Text(
                            d.deviceName.isEmpty
                                ? 'Unnamed host'
                                : d.deviceName,
                            style: text.titleMedium,
                          ),
                          subtitle: Text(
                            d.deviceAddress,
                            style: text.bodySmall,
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          enabled: !_busy,
                          onTap: () => _connectTo(d),
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  // --- store section -------------------------------------------------------

  Widget _buildStoreSection() {
    final TextTheme text = Theme.of(context).textTheme;
    final List<MeshMessage> messages = _store.all;
    final int unsynced = _store.unsyncedCount;

    return Column(
      children: <Widget>[
        _SectionHeader(
          title: 'STORE (${_store.count})',
          trailing: Text(
            unsynced == 0 ? 'all synced' : '$unsynced unsynced',
            style: text.bodySmall?.copyWith(
              color: unsynced == 0 ? AppColors.p3 : AppColors.p1,
            ),
          ),
        ),
        Expanded(
          child: messages.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      'No messages yet. Create one below — it will sync on '
                      'the next contact.',
                      textAlign: TextAlign.center,
                      style: text.bodySmall,
                    ),
                  ),
                )
              : ListView.separated(
                  padding: EdgeInsets.zero,
                  itemCount: messages.length,
                  separatorBuilder: (_, _) => const Divider(height: 1),
                  itemBuilder: (BuildContext context, int i) =>
                      _StoreRow(message: messages[i]),
                ),
        ),
      ],
    );
  }

  // --- sync log section ----------------------------------------------------

  Widget _buildLogSection() {
    final TextTheme text = Theme.of(context).textTheme;

    return Column(
      children: <Widget>[
        _SectionHeader(
          title: 'SYNC LOG',
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              // Read-only: runs the six check* calls and nothing else, so it
              // is always safe to press, connected or not.
              Tooltip(
                message: 'Run the six permission/radio checks, read-only',
                child: TextButton.icon(
                  style: _headerButtonStyle,
                  onPressed: _diagnosing ? null : _runDiagnostics,
                  icon: const Icon(Icons.troubleshoot, size: 18),
                  label: const Text('Diagnose'),
                ),
              ),
              TextButton.icon(
                style: _headerButtonStyle,
                onPressed: _busy ? null : _syncNow,
                icon: const Icon(Icons.sync, size: 18),
                label: const Text('Sync now'),
              ),
            ],
          ),
        ),
        Expanded(
          child: _log.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      'No protocol activity yet.',
                      style: text.bodySmall,
                    ),
                  ),
                )
              : ListView.builder(
                  controller: _logScroll,
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                  itemCount: _log.length,
                  itemBuilder: (BuildContext context, int i) =>
                      _LogRow(entry: _log[i]),
                ),
        ),
      ],
    );
  }

  // --- composer ------------------------------------------------------------

  /// `[⚡] Auto-generate   [10s ▾]   [switch]`
  Widget _buildAutoGenerateRow(TextTheme text) {
    const List<int> intervals = <int>[5, 10, 20, 30, 60];

    return Row(
      children: <Widget>[
        Icon(
          Icons.bolt,
          size: 20,
          color: _autoGenerate ? AppColors.p2 : AppColors.textSecondary,
        ),
        const SizedBox(width: 8),
        // Expanded so the label yields rather than overflowing at a large
        // system font scale.
        Expanded(
          child: Text(
            'Auto-generate',
            style: text.bodyMedium,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        const SizedBox(width: 8),
        DropdownButton<int>(
          value: _autoGenerateSeconds,
          underline: const SizedBox.shrink(),
          dropdownColor: AppColors.surfaceVariant,
          onChanged: (int? value) {
            if (value == null) return;
            _setAutoGenerate(seconds: value);
          },
          items: intervals
              .map(
                (int s) => DropdownMenuItem<int>(
                  value: s,
                  child: Text('${s}s', style: text.bodyMedium),
                ),
              )
              .toList(),
        ),
        const SizedBox(width: 4),
        Switch(
          value: _autoGenerate,
          onChanged: (bool v) => _setAutoGenerate(enabled: v),
        ),
      ],
    );
  }

  Widget _buildComposer() {
    final TextTheme text = Theme.of(context).textTheme;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      child: SafeArea(
        top: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            // Host-only: gives a cycling client new traffic to collect, so
            // messagesGained proves a real transfer rather than an empty
            // reconnect.
            if (_role == _MeshRole.host) ...<Widget>[
              _buildAutoGenerateRow(text),
              const Divider(height: 20),
            ],
            Text(
              'CREATE TEST MESSAGE',
              style: text.bodySmall?.copyWith(letterSpacing: 1.2),
            ),
            const SizedBox(height: 8),
            Row(
              children: <Widget>[
                Expanded(
                  child: Container(
                    height: AppTheme.minTouchTarget,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceVariant,
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: DropdownButton<MeshMessageType>(
                      value: _draftType,
                      isExpanded: true,
                      underline: const SizedBox.shrink(),
                      dropdownColor: AppColors.surfaceVariant,
                      onChanged: (MeshMessageType? value) {
                        if (value == null) return;
                        setState(() => _draftType = value);
                      },
                      items: MeshMessageType.values
                          .map(
                            (MeshMessageType t) =>
                                DropdownMenuItem<MeshMessageType>(
                                  value: t,
                                  child: Row(
                                    children: <Widget>[
                                      StatusBadge.severity(
                                        'P${t.defaultPriority}',
                                        dense: true,
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          t.label,
                                          style: text.bodyLarge,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                          )
                          .toList(),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                SizedBox(
                  width: AppTheme.minTouchTarget,
                  height: AppTheme.minTouchTarget,
                  child: ElevatedButton(
                    onPressed: _createTestMessage,
                    style: ElevatedButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: const Size.square(AppTheme.minTouchTarget),
                    ),
                    child: const Icon(Icons.add, size: 26),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// One icon-and-number pair in the connection health strip.
class _HealthCounter extends StatelessWidget {
  const _HealthCounter({
    required this.icon,
    required this.value,
    required this.color,
    required this.tooltip,
  });

  final IconData icon;
  final int value;
  final Color color;
  final String tooltip;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 5),
          Text(
            '$value',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

/// Small all-caps bar that titles the Store and Sync log panes.
class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.trailing});

  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 48,
      width: double.infinity,
      color: AppColors.surfaceVariant,
      padding: const EdgeInsets.fromLTRB(16, 0, 8, 0),
      child: Row(
        children: <Widget>[
          // The title yields space rather than the actions: at a large system
          // font scale the buttons must stay whole and tappable, and "STORE
          // (12)" degrades acceptably to an ellipsis.
          Expanded(
            child: Text(
              title,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(letterSpacing: 1.2, color: AppColors.textPrimary),
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

/// One message in the store.
class _StoreRow extends StatelessWidget {
  const _StoreRow({required this.message});

  final MeshMessage message;

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;
    final DateTime local = message.createdAt.toLocal();
    String two(int n) => n.toString().padLeft(2, '0');
    final String time =
        '${two(local.hour)}:${two(local.minute)}:${two(local.second)}';
    final String? incidentType = message.payload['incidentType'] as String?;
    final String? severity = message.payload['severity'] as String?;
    final Widget? preview = _thumbnail(message.payload['thumbnailBase64']);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: <Widget>[
          // Priority band reuses the P0–P3 severity colours; p4 (media) has no
          // severity colour and falls through to grey, which is what we want.
          StatusBadge.severity('P${message.priority}', dense: true),
          const SizedBox(width: 12),
          if (preview != null) ...<Widget>[preview, const SizedBox(width: 10)],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  incidentType == null
                      ? message.type
                      : '${incidentType.replaceAll('_', ' ')}${severity == null ? '' : ' · $severity'}',
                  style: text.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                Text(
                  '${DeviceIdentity.shorten(message.originDevice)}'
                  '  ·  $time  ·  #${DeviceIdentity.shorten(message.id)}',
                  style: text.bodySmall,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Icon(
            message.synced ? Icons.cloud_done : Icons.cloud_off,
            size: 22,
            color: message.synced ? AppColors.p3 : AppColors.textSecondary,
          ),
        ],
      ),
    );
  }

  /// Invalid previews from an older or corrupt peer must never break the
  /// message list; the report metadata is still valuable without the image.
  Widget? _thumbnail(Object? encoded) {
    if (encoded is! String || encoded.isEmpty) return null;
    try {
      return ClipRRect(
        borderRadius: BorderRadius.circular(6),
        child: Image.memory(
          base64Decode(encoded),
          width: 42,
          height: 42,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => const SizedBox.shrink(),
        ),
      );
    } on FormatException {
      return null;
    }
  }
}

/// One line of the sync log, monospaced so columns line up while it scrolls.
class _LogRow extends StatelessWidget {
  const _LogRow({required this.entry});

  final _LogEntry entry;

  static const TextStyle _mono = TextStyle(
    fontFamily: 'monospace',
    fontFamilyFallback: <String>['Courier New', 'Courier'],
    fontSize: 13,
    height: 1.4,
  );

  /// Colour by severity first, then by the leading marker the protocol writes:
  /// `>` outbound, `<` inbound, `!` failure, `?` unrecognised.
  Color get _color {
    switch (entry.kind) {
      case _LogKind.error:
        return AppColors.p0;
      case _LogKind.warn:
        return AppColors.p1;
      case _LogKind.system:
        return AppColors.textSecondary;
      case _LogKind.protocol:
        if (entry.text.startsWith('>')) return AppColors.info;
        if (entry.text.startsWith('!')) return AppColors.p0;
        if (entry.text.startsWith('?')) return AppColors.p1;
        return AppColors.textPrimary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            entry.stamp,
            style: _mono.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(entry.text, style: _mono.copyWith(color: _color)),
          ),
        ],
      ),
    );
  }
}
