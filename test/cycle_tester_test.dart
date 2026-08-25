// Behavioural spec for the cycle-test harness.
//
// The point of the harness is that failures are data: a cycle that fails must
// be RECORDED and the loop must CONTINUE. These tests pin that, plus the
// stop-cleanly guarantee and the round-robin target selection that multi-node
// runs will depend on.
//
// The tester drives a ConnectionManager over a fake client, so these exercise
// the same hardened path the Mesh screen uses.


import 'package:flutter_p2p_connection/flutter_p2p_connection.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:oneroof/mesh/connection_manager.dart';
import 'package:oneroof/mesh/cycle_tester.dart';
import 'package:oneroof/mesh/message_store.dart';
import 'package:oneroof/mesh/sync_protocol.dart';

import 'fake_p2p_client.dart';

/// Sub-second policy so the loop runs at test speed.
const ConnectionTuning _fast = ConnectionTuning(
  scanTimeout: Duration(milliseconds: 30),
  connectTimeout: Duration(milliseconds: 30),
  cooldown: Duration(milliseconds: 10),
  backoffBase: Duration(milliseconds: 2),
  backoffCap: Duration(milliseconds: 20),
  failureThreshold: 99, // breaker off unless a test asks for it
  recoveryPause: Duration(milliseconds: 10),
  scanWatchdog: Duration(milliseconds: 200),
  connectWatchdog: Duration(milliseconds: 200),
  disconnectWatchdog: Duration(milliseconds: 200),
);

ConnectionManager _manager(
  FakeP2pClient fake, {
  ConnectionTuning tuning = _fast,
}) {
  return ConnectionManager(
    username: 'test',
    tuning: tuning,
    clientFactory: () => fake,
  );
}

CycleTester _tester(
  ConnectionManager connection,
  MessageStore store, {
  int? cycles = 3,
  List<BleDiscoveredDevice> targets = const <BleDiscoveredDevice>[],
}) {
  return CycleTester(
    connection: connection,
    store: store,
    protocol: const SyncProtocol(),
    targets: targets,
    cycleCount: cycles,
    syncSettle: const Duration(milliseconds: 10),
    settleDelay: const Duration(milliseconds: 10),
  );
}

void main() {
  group('CycleTester', () {
    test('runs the requested number of cycles and reports each one', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      );
      final ConnectionManager connection = _manager(fake);
      addTearDown(connection.dispose);
      await connection.initialize();

      final MessageStore store = MessageStore();
      final CycleTester tester = _tester(connection, store);
      final List<CycleResult> seen = <CycleResult>[];
      tester.results.listen(seen.add);

      await tester.start();
      await Future<void>.delayed(Duration.zero);

      expect(seen.length, 3);
      expect(seen.every((CycleResult r) => r.succeeded), isTrue);
      expect(seen.map((CycleResult r) => r.cycleNumber), <int>[1, 2, 3]);
      expect(fake.connectCalls, 3);
      await tester.dispose();
    });

    test('a failed connect is recorded and the loop continues', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      )..failConnectOnCall = <int>{2};
      final ConnectionManager connection = _manager(fake);
      addTearDown(connection.dispose);
      await connection.initialize();

      final MessageStore store = MessageStore();
      final CycleTester tester = _tester(connection, store, cycles: 4);
      final List<CycleResult> seen = <CycleResult>[];
      tester.results.listen(seen.add);

      await tester.start();
      await Future<void>.delayed(Duration.zero);

      // All four cycles ran — the failure did not abort the run.
      expect(seen.length, 4);
      expect(seen[1].succeeded, isFalse);
      expect(seen[1].connectSucceeded, isFalse);
      expect(seen[1].errorType, 'TimeoutException');
      expect(seen[1].errorMessage, contains('connect refused by peer'));
      // The cycles either side are unaffected.
      expect(seen[0].succeeded, isTrue);
      expect(seen[2].succeeded, isTrue);
      expect(seen[3].succeeded, isTrue);
      await tester.dispose();
    });

    test('an empty scan is a recorded failure, not a crash', () async {
      final FakeP2pClient fake = FakeP2pClient();
      final ConnectionManager connection = _manager(fake);
      addTearDown(connection.dispose);
      await connection.initialize();

      final MessageStore store = MessageStore();
      final CycleTester tester = _tester(connection, store, cycles: 2);
      final List<CycleResult> seen = <CycleResult>[];
      tester.results.listen(seen.add);

      await tester.start();
      await Future<void>.delayed(Duration.zero);

      expect(seen.length, 2);
      expect(seen.every((CycleResult r) => r.scanSucceeded), isFalse);
      expect(seen.first.errorType, 'NoHostsFound');
      expect(fake.connectCalls, 0);
      // Told the manager, so a deaf radio still counts toward the breaker.
      expect(connection.consecutiveFailures, 2);
      await tester.dispose();
    });

    test('disconnects after every cycle, including failed ones', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      )..failConnectOnCall = <int>{1, 2, 3};
      final ConnectionManager connection = _manager(fake);
      addTearDown(connection.dispose);
      await connection.initialize();

      final MessageStore store = MessageStore();
      final CycleTester tester = _tester(connection, store);

      await tester.start();

      // Every failed cycle still releases the radio, and the run ends idle or
      // cooling down — never attached.
      expect(fake.disconnectCalls, greaterThanOrEqualTo(3));
      expect(connection.isConnected, isFalse);
      await tester.dispose();
    });

    test('messagesGained reflects what actually arrived', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      );
      final ConnectionManager connection = _manager(fake);
      addTearDown(connection.dispose);
      await connection.initialize();

      final MessageStore store = MessageStore();
      fake
        ..storeToFeed = store
        ..feedPerSync = 2;

      final CycleTester tester = _tester(connection, store);
      final List<CycleResult> seen = <CycleResult>[];
      tester.results.listen(seen.add);

      await tester.start();
      await Future<void>.delayed(Duration.zero);

      expect(seen.map((CycleResult r) => r.messagesGained), <int>[2, 2, 2]);
      expect(seen.last.storeCountAfter, 6);
      await tester.dispose();
    });

    test('stop() halts the run and leaves the client disconnected', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      );
      final ConnectionManager connection = _manager(fake);
      addTearDown(connection.dispose);
      await connection.initialize();

      final MessageStore store = MessageStore();
      final CycleTester tester = CycleTester(
        connection: connection,
        store: store,
        protocol: const SyncProtocol(),
        cycleCount: null, // infinite
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
      expect(fake.disconnectCalls, greaterThan(0));
      expect(connection.isConnected, isFalse);
      await tester.dispose();
    });

    test('targets are visited round-robin', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA'), fakeDevice('BB')],
      );
      final ConnectionManager connection = _manager(fake);
      addTearDown(connection.dispose);
      await connection.initialize();

      final MessageStore store = MessageStore();
      final CycleTester tester = _tester(
        connection,
        store,
        cycles: 4,
        targets: <BleDiscoveredDevice>[fakeDevice('AA'), fakeDevice('BB')],
      );

      await tester.start();

      expect(fake.connectedTo, <String>['AA', 'BB', 'AA', 'BB']);
      await tester.dispose();
    });

    test('a target that is out of range is a recorded failure', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      );
      final ConnectionManager connection = _manager(fake);
      addTearDown(connection.dispose);
      await connection.initialize();

      final MessageStore store = MessageStore();
      final CycleTester tester = _tester(
        connection,
        store,
        cycles: 1,
        targets: <BleDiscoveredDevice>[fakeDevice('ZZ')],
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
      final BleDiscoveredDevice stale = fakeDevice('AA');
      const BleDiscoveredDevice fresh =
          BleDiscoveredDevice(deviceAddress: 'AA', deviceName: 'renamed');
      final ConnectionManager connection = _manager(FakeP2pClient());
      addTearDown(connection.dispose);
      final CycleTester tester = CycleTester(
        connection: connection,
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
