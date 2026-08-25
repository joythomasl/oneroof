import 'dart:async';

import 'package:flutter_p2p_connection/flutter_p2p_connection.dart';
import 'package:oneroof/mesh/mesh_message.dart';
import 'package:oneroof/mesh/message_store.dart';

BleDiscoveredDevice fakeDevice(String address) =>
    BleDiscoveredDevice(deviceAddress: address, deviceName: 'host-$address');

/// A [FlutterP2pClient] with every platform-touching method replaced, so the
/// connection state machine and the cycle harness can be driven without a
/// radio — including the failure modes a radio only shows you on stage.
class FakeP2pClient extends FlutterP2pClient {
  FakeP2pClient({this.discovered = const <BleDiscoveredDevice>[]});

  List<BleDiscoveredDevice> discovered;

  int initializeCalls = 0;
  int disposeCalls = 0;
  int scanCalls = 0;
  int connectCalls = 0;
  int disconnectCalls = 0;
  int broadcastCalls = 0;
  final List<String> connectedTo = <String>[];

  /// Connect-call numbers (1-based) that should throw [connectError].
  Set<int> failConnectOnCall = <int>{};
  Object connectError = TimeoutException('connect refused by peer');

  /// When true, connect never completes — the watchdog is the only way out.
  bool hangConnect = false;

  /// When true, the scan never delivers or finishes.
  bool hangScan = false;

  /// When true, disconnect never completes.
  bool hangDisconnect = false;

  /// Messages to drop into [storeToFeed] whenever a digest is broadcast,
  /// simulating a peer answering with MSG frames.
  MessageStore? storeToFeed;
  int feedPerSync = 0;

  @override
  Future<void> initialize() async => initializeCalls++;

  @override
  Future<void> dispose() async => disposeCalls++;

  @override
  Future<StreamSubscription<List<BleDiscoveredDevice>>> startScan(
    void Function(List<BleDiscoveredDevice>)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
    Duration timeout = const Duration(seconds: 15),
  }) async {
    scanCalls++;
    if (!hangScan) {
      // Deliver asynchronously the way the real scan does, then close the
      // window so a scan that finds nothing still terminates.
      scheduleMicrotask(() {
        onData?.call(discovered);
        onDone?.call();
      });
    }
    return const Stream<List<BleDiscoveredDevice>>.empty().listen((_) {});
  }

  @override
  Future<void> stopScan() async {}

  @override
  Future<void> connectWithDevice(
    BleDiscoveredDevice device, {
    Duration timeout = const Duration(seconds: 20),
  }) async {
    connectCalls++;
    if (hangConnect) return Completer<void>().future;
    if (failConnectOnCall.contains(connectCalls)) throw connectError;
    connectedTo.add(device.deviceAddress);
  }

  @override
  Future<void> disconnect() async {
    disconnectCalls++;
    if (hangDisconnect) return Completer<void>().future;
  }

  @override
  Future<void> broadcastText(String text, {String? excludeClientId}) async {
    broadcastCalls++;
    final MessageStore? store = storeToFeed;
    if (store == null) return;
    for (int i = 0; i < feedPerSync; i++) {
      store.add(MeshMessage.create(
        type: MeshMessageType.statusUpdate.wireName,
        originDevice: 'peer',
        originUser: 'peer-user',
      ));
    }
  }
}
