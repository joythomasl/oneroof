// Behavioural spec for the cycle-test harness.
//
// The point of the harness is that failures are data: a cycle that fails must
// be RECORDED and the loop must CONTINUE. These tests pin that, plus the
// stop-cleanly guarantee and the round-robin target selection that multi-node
// runs will depend on.

import 'dart:async';

import 'package:flutter_p2p_connection/flutter_p2p_connection.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:oneroof/mesh/cycle_tester.dart';
import 'package:oneroof/mesh/mesh_message.dart';
import 'package:oneroof/mesh/message_store.dart';
import 'package:oneroof/mesh/sync_protocol.dart';

BleDiscoveredDevice _device(String address) =>
    BleDiscoveredDevice(deviceAddress: address, deviceName: 'host-$address');

/// A [FlutterP2pClient] with every platform-touching method replaced, so the
/// loop can be driven without a radio.
class _FakeClient extends FlutterP2pClient {
  _FakeClient({this.discovered = const <BleDiscoveredDevice>[]});

  List<BleDiscoveredDevice> discovered;

  int scanCalls = 0;
  int connectCalls = 0;
  int disconnectCalls = 0;
  int broadcastCalls = 0;
  final List<String> connectedTo = <String>[];

  /// Cycle numbers (1-based) on which connect should throw.
  Set<int> failConnectOnCall = <int>{};

  /// Messages to drop into the store when a digest goes out, simulating a
  /// peer answering with MSG frames.
  MessageStore? storeToFeed;
  int feedPerSync = 0;

  Object connectError = TimeoutException('connect timed out');

  @override
  Future<StreamSubscription<List<BleDiscoveredDevice>>> startScan(
    void Function(List<BleDiscoveredDevice>)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
    Duration timeout = const Duration(seconds: 15),
  }) async {
    scanCalls++;
    // Deliver asynchronously, the way the real scan does.
    scheduleMicrotask(() {
      onData?.call(discovered);
      if (discovered.isEmpty) onDone?.call();
    });
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
    if (failConnectOnCall.contains(connectCalls)) throw connectError;
    connectedTo.add(device.deviceAddress);
  }

  @override
  Future<void> disconnect() async => disconnectCalls++;

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

CycleTester _tester(
  _FakeClient client,
  MessageStore store, {
  int? cycles = 3,
  List<BleDiscoveredDevice> targets = const <BleDiscoveredDevice>[],
  Future<void> Function()? onConnected,
}) {
  return CycleTester(
    client: client,
    store: store,
    protocol: const SyncProtocol(),
    targets: targets,
    cycleCount: cycles,
    // Near-zero so the loop runs at test speed; the real values are operator
    // tunable and carry no logic of their own.
    scanTimeout: const Duration(milliseconds: 40),
    connectTimeout: const Duration(milliseconds: 40),
    syncSettle: const Duration(milliseconds: 10),
    settleDelay: const Duration(milliseconds: 10),
    onConnected: onConnected,
  );
}

void main() {
  group('CycleTester', () {
    test('runs the requested number of cycles and reports each one', () async {
      final _FakeClient client = _FakeClient(discovered: <BleDiscoveredDevice>[
        _device('AA'),
      ]);
      final MessageStore store = MessageStore();
      final CycleTester tester = _tester(client, store);
      final List<CycleResult> seen = <CycleResult>[];
      tester.results.listen(seen.add);

      await tester.start();
      await Future<void>.delayed(Duration.zero);

      expect(seen.length, 3);
      expect(seen.every((CycleResult r) => r.succeeded), isTrue);
      expect(seen.map((CycleResult r) => r.cycleNumber), <int>[1, 2, 3]);
      expect(client.connectCalls, 3);
      await tester.dispose();
    });

    test('a failed connect is recorded and the loop continues', () async {
      final _FakeClient client = _FakeClient(discovered: <BleDiscoveredDevice>[
        _device('AA'),
      ])
        ..failConnectOnCall = <int>{2};
      final MessageStore store = MessageStore();
      final CycleTester tester = _tester(client, store, cycles: 4);
      final List<CycleResult> seen = <CycleResult>[];
      tester.results.listen(seen.add);

      await tester.start();
      await Future<void>.delayed(Duration.zero);

      // All four cycles ran — the failure did not abort the run.
      expect(seen.length, 4);
      expect(seen[1].succeeded, isFalse);
      expect(seen[1].connectSucceeded, isFalse);
      expect(seen[1].errorType, 'TimeoutException');
      expect(seen[1].errorMessage, contains('connect timed out'));
      // The cycles either side are unaffected.
      expect(seen[0].succeeded, isTrue);
      expect(seen[2].succeeded, isTrue);
      expect(seen[3].succeeded, isTrue);
      await tester.dispose();
    });

    test('an empty scan is a recorded failure, not a crash', () async {
      final _FakeClient client = _FakeClient();
      final MessageStore store = MessageStore();
      final CycleTester tester = _tester(client, store, cycles: 2);
      final List<CycleResult> seen = <CycleResult>[];
      tester.results.listen(seen.add);

      await tester.start();
      await Future<void>.delayed(Duration.zero);

      expect(seen.length, 2);
      expect(seen.every((CycleResult r) => r.scanSucceeded), isFalse);
      expect(seen.first.errorType, 'NoHostsFound');
      expect(client.connectCalls, 0);
      await tester.dispose();
    });

    test('disconnects after every cycle, including failed ones', () async {
      final _FakeClient client = _FakeClient(discovered: <BleDiscoveredDevice>[
        _device('AA'),
      ])
        ..failConnectOnCall = <int>{1, 2, 3};
      final MessageStore store = MessageStore();
      final CycleTester tester = _tester(client, store);

      await tester.start();

      // Once per cycle, plus the defensive disconnect at start and at finish.
      expect(client.disconnectCalls, greaterThanOrEqualTo(3));
      await tester.dispose();
    });

    test('messagesGained reflects what actually arrived', () async {
      final _FakeClient client = _FakeClient(discovered: <BleDiscoveredDevice>[
        _device('AA'),
      ]);
      final MessageStore store = MessageStore();
      client
        ..storeToFeed = store
        ..feedPerSync = 2;

      final CycleTester tester = _tester(client, store);
      final List<CycleResult> seen = <CycleResult>[];
      tester.results.listen(seen.add);

      await tester.start();
      await Future<void>.delayed(Duration.zero);

      expect(seen.map((CycleResult r) => r.messagesGained), <int>[2, 2, 2]);
      expect(seen.last.storeCountAfter, 6);
      await tester.dispose();
    });

    test('onConnected fires after each connect, before the digest', () async {
      final _FakeClient client = _FakeClient(discovered: <BleDiscoveredDevice>[
        _device('AA'),
      ]);
      final MessageStore store = MessageStore();
      final List<int> broadcastsAtRebind = <int>[];

      final CycleTester tester = _tester(
        client,
        store,
        onConnected: () async => broadcastsAtRebind.add(client.broadcastCalls),
      );

      await tester.start();

      // Called once per cycle, and each time no digest had gone out yet for
      // that cycle — so the re-bound listener cannot miss the reply.
      expect(broadcastsAtRebind, <int>[0, 1, 2]);
      await tester.dispose();
    });

    test('stop() halts the run and leaves the client disconnected', () async {
      final _FakeClient client = _FakeClient(discovered: <BleDiscoveredDevice>[
        _device('AA'),
      ]);
      final MessageStore store = MessageStore();
      final CycleTester tester = CycleTester(
        client: client,
        store: store,
        protocol: const SyncProtocol(),
        cycleCount: null, // infinite
        scanTimeout: const Duration(milliseconds: 20),
        connectTimeout: const Duration(milliseconds: 20),
        syncSettle: const Duration(milliseconds: 10),
        settleDelay: const Duration(seconds: 30), // long, must be cut short
      );

      final List<CycleResult> seen = <CycleResult>[];
      tester.results.listen(seen.add);

      final Future<void> run = tester.start();
      await Future<void>.delayed(const Duration(milliseconds: 120));
      expect(tester.isRunning, isTrue);

      // Would take 30s if the settle delay were not interruptible.
      final Stopwatch sw = Stopwatch()..start();
      await tester.stop();
      sw.stop();
      await run;

      expect(sw.elapsed, lessThan(const Duration(seconds: 5)));
      expect(tester.isRunning, isFalse);
      expect(seen, isNotEmpty);
      expect(client.disconnectCalls, greaterThan(0));
      await tester.dispose();
    });

    test('targets are visited round-robin', () async {
      final _FakeClient client = _FakeClient(discovered: <BleDiscoveredDevice>[
        _device('AA'),
        _device('BB'),
      ]);
      final MessageStore store = MessageStore();
      final CycleTester tester = _tester(
        client,
        store,
        cycles: 4,
        targets: <BleDiscoveredDevice>[_device('AA'), _device('BB')],
      );

      await tester.start();

      expect(client.connectedTo, <String>['AA', 'BB', 'AA', 'BB']);
      await tester.dispose();
    });

    test('a target that is out of range is a recorded failure', () async {
      final _FakeClient client = _FakeClient(discovered: <BleDiscoveredDevice>[
        _device('AA'),
      ]);
      final MessageStore store = MessageStore();
      final CycleTester tester = _tester(
        client,
        store,
        cycles: 1,
        targets: <BleDiscoveredDevice>[_device('ZZ')],
      );
      final List<CycleResult> seen = <CycleResult>[];
      tester.results.listen(seen.add);

      await tester.start();
      await Future<void>.delayed(Duration.zero);

      expect(seen.single.scanSucceeded, isTrue);
      expect(seen.single.connectSucceeded, isFalse);
      expect(seen.single.errorType, 'TargetNotFound');
      await tester.dispose();
    });

    test('selectTarget picks the freshly discovered instance', () {
      final BleDiscoveredDevice stale = _device('AA');
      final BleDiscoveredDevice fresh =
          BleDiscoveredDevice(deviceAddress: 'AA', deviceName: 'renamed');
      final CycleTester tester = CycleTester(
        client: _FakeClient(),
        store: MessageStore(),
        protocol: const SyncProtocol(),
        targets: <BleDiscoveredDevice>[stale],
      );

      final BleDiscoveredDevice? picked =
          tester.selectTarget(<BleDiscoveredDevice>[fresh], 0);
      expect(identical(picked, fresh), isTrue);
    });
  });

  group('CycleSummary', () {
    CycleResult result(int n, {required bool ok, int connectMs = 1000}) {
      return CycleResult(
        cycleNumber: n,
        startedAt: DateTime.utc(2026, 8, 25),
        scanSucceeded: true,
        connectSucceeded: ok,
        scanDuration: const Duration(milliseconds: 500),
        connectDuration: Duration(milliseconds: ok ? connectMs : 0),
        totalCycleDuration: const Duration(seconds: 10),
        messagesGained: ok ? 1 : 0,
        storeCountAfter: n,
        errorType: ok ? null : 'TimeoutException',
      );
    }

    test('is empty-safe', () {
      final CycleSummary s = CycleSummary.from(<CycleResult>[]);
      expect(s.attempted, 0);
      expect(s.successRate, 0);
      expect(s.meanConnect, Duration.zero);
    });

    test('averages connect over successful connects only', () {
      // A failed connect contributes no duration; folding its timeout into the
      // mean would make a healthy radio look slow.
      final CycleSummary s = CycleSummary.from(<CycleResult>[
        result(1, ok: true, connectMs: 1000),
        result(2, ok: false),
        result(3, ok: true, connectMs: 3000),
      ]);

      expect(s.attempted, 3);
      expect(s.completed, 2);
      expect(s.successRate, closeTo(66.7, 0.1));
      expect(s.meanConnect, const Duration(milliseconds: 2000));
      expect(s.worstConnect, const Duration(milliseconds: 3000));
      expect(s.meanTotal, const Duration(seconds: 10));
    });

    test('tracks trailing and maximum failure streaks', () {
      final CycleSummary s = CycleSummary.from(<CycleResult>[
        result(1, ok: false),
        result(2, ok: false),
        result(3, ok: false),
        result(4, ok: true),
        result(5, ok: false),
        result(6, ok: false),
      ]);

      // Trailing streak is the live degradation signal; max is the worst seen.
      expect(s.consecutiveFailures, 2);
      expect(s.maxConsecutiveFailures, 3);
    });
  });
}
