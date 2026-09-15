// Behavioural spec for the connection state machine.
//
// The failure mode this defends against — repeated connect/disconnect cycles
// wedging the Wi-Fi radio — cannot be reproduced on a desktop, so these tests
// pin the *policy* instead: what the guards refuse, what the watchdog aborts,
// what the breaker rebuilds, and what the backoff maths produce.

import 'dart:async';

import 'package:flutter_p2p_connection/flutter_p2p_connection.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:oneroof/mesh/connection_manager.dart';

import 'fake_p2p_client.dart';

/// Sub-second everywhere, so the loop runs at test speed. None of these values
/// carry logic; the policy under test is the same at 4s or 40ms.
const ConnectionTuning _fast = ConnectionTuning(
  scanTimeout: Duration(milliseconds: 40),
  connectTimeout: Duration(milliseconds: 40),
  cooldown: Duration(milliseconds: 30),
  backoffBase: Duration(milliseconds: 5),
  backoffCap: Duration(milliseconds: 60),
  failureThreshold: 3,
  recoveryPause: Duration(milliseconds: 20),
  scanWatchdog: Duration(milliseconds: 80),
  connectWatchdog: Duration(milliseconds: 80),
  disconnectWatchdog: Duration(milliseconds: 80),
);

void main() {
  group('backoff maths', () {
    test('is base * 2^failures, capped, and zero at rest', () {
      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: const ConnectionTuning(
          backoffBase: Duration(seconds: 1),
          backoffCap: Duration(seconds: 30),
        ),
        clientFactory: FakeP2pClient.new,
      );
      addTearDown(m.dispose);

      // No failures means no retry, so nothing to back off from.
      expect(m.backoffFor(0), Duration.zero);
      expect(m.backoffFor(-1), Duration.zero);

      expect(m.backoffFor(1), const Duration(seconds: 2));
      expect(m.backoffFor(2), const Duration(seconds: 4));
      expect(m.backoffFor(3), const Duration(seconds: 8));
      expect(m.backoffFor(4), const Duration(seconds: 16));

      // 32s would exceed the cap.
      expect(m.backoffFor(5), const Duration(seconds: 30));
      expect(m.backoffFor(60), const Duration(seconds: 30));
    });

    test('honours a custom base and cap', () {
      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: const ConnectionTuning(
          backoffBase: Duration(milliseconds: 250),
          backoffCap: Duration(seconds: 2),
        ),
        clientFactory: FakeP2pClient.new,
      );
      addTearDown(m.dispose);

      expect(m.backoffFor(1), const Duration(milliseconds: 500));
      expect(m.backoffFor(2), const Duration(seconds: 1));
      expect(m.backoffFor(3), const Duration(seconds: 2)); // capped
    });
  });

  group('state guards', () {
    test('a second connect while one is in flight is refused, not queued',
        () async {
      final Completer<void> hold = Completer<void>();
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      );
      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: const ConnectionTuning(connectWatchdog: Duration(seconds: 5)),
        clientFactory: () => fake,
      );
      addTearDown(m.dispose);
      await m.initialize();

      // Hold the first connect open.
      fake.hangConnect = true;
      final Future<OperationOutcome<void>> first =
          m.connect(fakeDevice('AA'));
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(m.state, MeshConnectionState.connecting);

      final OperationOutcome<void> second = await m.connect(fakeDevice('AA'));

      expect(second.rejected, isTrue);
      expect(second.errorType, 'InvalidState');
      // The critical assertion: the radio was only ever asked once.
      expect(fake.connectCalls, 1);

      hold.complete();
      unawaited(first);
    });

    test('connect while connected is refused', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      );
      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: _fast,
        clientFactory: () => fake,
      );
      addTearDown(m.dispose);
      await m.initialize();

      expect((await m.connect(fakeDevice('AA'))).succeeded, isTrue);
      expect(m.state, MeshConnectionState.connected);

      final OperationOutcome<void> again = await m.connect(fakeDevice('AA'));
      expect(again.rejected, isTrue);
      expect(fake.connectCalls, 1);
    });

    test('scan while connected is refused', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      );
      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: _fast,
        clientFactory: () => fake,
      );
      addTearDown(m.dispose);
      await m.initialize();
      await m.connect(fakeDevice('AA'));

      final int scansBefore = fake.scanCalls;
      final OperationOutcome<List<BleDiscoveredDevice>> outcome =
          await m.scan();

      expect(outcome.rejected, isTrue);
      expect(fake.scanCalls, scansBefore);
    });

    test('disconnect is idempotent and safe from any state', () async {
      final FakeP2pClient fake = FakeP2pClient();
      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: _fast,
        clientFactory: () => fake,
      );
      addTearDown(m.dispose);
      await m.initialize();

      // From idle: a logged no-op, and it must not touch the radio.
      await m.disconnect();
      expect(fake.disconnectCalls, 0);

      // Repeated calls from every reachable state stay safe.
      await m.disconnect();
      await m.disconnect();
      expect(m.state, MeshConnectionState.idle);
    });
  });

  group('watchdog', () {
    test('aborts a hung connect into cooldown', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      )..hangConnect = true;

      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: _fast,
        clientFactory: () => fake,
      );
      addTearDown(m.dispose);
      await m.initialize();

      final OperationOutcome<void> outcome = await m.connect(fakeDevice('AA'));

      // A hang and a refusal are different failures, and must not be conflated.
      expect(outcome.succeeded, isFalse);
      expect(outcome.errorType, WatchdogTimeout.type);
      expect(m.state, MeshConnectionState.cooldown);
      expect(m.consecutiveFailures, 1);
      expect(m.health.lastFailureType, WatchdogTimeout.type);
    });

    test('aborts a hung scan into cooldown', () async {
      final FakeP2pClient fake = FakeP2pClient()..hangScan = true;
      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: _fast,
        clientFactory: () => fake,
      );
      addTearDown(m.dispose);
      await m.initialize();

      final OperationOutcome<List<BleDiscoveredDevice>> outcome =
          await m.scan();

      expect(outcome.errorType, WatchdogTimeout.type);
      expect(m.state, MeshConnectionState.cooldown);
    });

    test('a hung disconnect still ends in cooldown', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      );
      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: _fast,
        clientFactory: () => fake,
      );
      addTearDown(m.dispose);
      await m.initialize();
      await m.connect(fakeDevice('AA'));

      // Refusing to move on is exactly how a run wedges.
      fake.hangDisconnect = true;
      await m.disconnect();

      expect(m.state, MeshConnectionState.cooldown);
      expect(m.health.lastFailureType, WatchdogTimeout.type);
    });

    test('a real timeout is reported as itself, not as a watchdog', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      )..failConnectOnCall = <int>{1};

      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: _fast,
        clientFactory: () => fake,
      );
      addTearDown(m.dispose);
      await m.initialize();

      final OperationOutcome<void> outcome = await m.connect(fakeDevice('AA'));
      expect(outcome.errorType, 'TimeoutException');
      expect(outcome.errorType, isNot(WatchdogTimeout.type));
    });
  });

  group('circuit breaker', () {
    test('fires at the threshold and rebuilds the client', () async {
      final List<FakeP2pClient> built = <FakeP2pClient>[];
      FakeP2pClient make() {
        final FakeP2pClient c = FakeP2pClient(
          discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
        )..failConnectOnCall = <int>{1, 2, 3, 4, 5};
        built.add(c);
        return c;
      }

      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: _fast, // threshold 3
        clientFactory: make,
      );
      addTearDown(m.dispose);
      await m.initialize();
      expect(built.length, 1);

      // Three failures, no recovery yet.
      for (int i = 0; i < 3; i++) {
        await m.connect(fakeDevice('AA'));
      }
      expect(m.consecutiveFailures, 3);
      expect(m.recoveryCount, 0);
      expect(built.length, 1);

      // The next scan trips the breaker instead of retrying.
      await m.scan();

      expect(m.recoveryCount, 1);
      expect(built.length, 2, reason: 'a fresh client must be constructed');
      expect(built.first.disposeCalls, 1,
          reason: 'the wedged client must be disposed');
      expect(built.last.initializeCalls, 1);
      // Reset, or the very next scan would recover again in a tight loop.
      expect(m.consecutiveFailures, 0);
    });

    test('does not fire below the threshold', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      )..failConnectOnCall = <int>{1, 2};

      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: _fast,
        clientFactory: () => fake,
      );
      addTearDown(m.dispose);
      await m.initialize();

      await m.connect(fakeDevice('AA'));
      await m.connect(fakeDevice('AA'));
      expect(m.consecutiveFailures, 2);

      await m.scan();
      expect(m.recoveryCount, 0);
    });

    test('caller-reported failures also count toward the breaker', () async {
      // An empty scan is not an exception, but a radio gone deaf shows up
      // exactly that way — so it has to reach the same counters.
      final FakeP2pClient fake = FakeP2pClient();
      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: _fast,
        clientFactory: () => fake,
      );
      addTearDown(m.dispose);
      await m.initialize();

      m.noteFailure('NoHostsFound');
      m.noteFailure('NoHostsFound');
      m.noteFailure('NoHostsFound');
      expect(m.consecutiveFailures, 3);

      await m.scan();
      expect(m.recoveryCount, 1);
    });

    test('a success clears the failure streak', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      )..failConnectOnCall = <int>{1, 2};

      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: _fast,
        clientFactory: () => fake,
      );
      addTearDown(m.dispose);
      await m.initialize();

      await m.connect(fakeDevice('AA'));
      await m.connect(fakeDevice('AA'));
      expect(m.consecutiveFailures, 2);

      await m.disconnect();
      final OperationOutcome<void> ok = await m.connect(fakeDevice('AA'));

      expect(ok.succeeded, isTrue);
      expect(m.consecutiveFailures, 0);
      expect(m.health.lastFailureType, isNull);
    });
  });

  group('cooldown', () {
    test('a disconnect holds the manager in cooldown', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      );
      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: _fast.copyWith(cooldown: const Duration(milliseconds: 120)),
        clientFactory: () => fake,
      );
      addTearDown(m.dispose);
      await m.initialize();
      await m.connect(fakeDevice('AA'));

      await m.disconnect();
      expect(m.state, MeshConnectionState.cooldown);

      // A scan issued inside the window waits it out rather than reading a
      // stale group.
      final Stopwatch sw = Stopwatch()..start();
      await m.scan();
      sw.stop();
      expect(sw.elapsedMilliseconds, greaterThanOrEqualTo(60));
    });
  });

  group('onConnected', () {
    test('fires before connect() returns', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      );
      bool fired = false;
      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: _fast,
        clientFactory: () => fake,
        onConnected: () async => fired = true,
      );
      addTearDown(m.dispose);
      await m.initialize();

      expect(fired, isFalse);
      await m.connect(fakeDevice('AA'));
      // Anything the caller sends next is therefore after the re-bind.
      expect(fired, isTrue);
    });

    test('onClientChanged fires on init and again after a recovery', () async {
      final List<FakeP2pClient> handed = <FakeP2pClient>[];
      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: _fast,
        clientFactory: () => FakeP2pClient(
          discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
        ),
        onClientChanged: (FlutterP2pClient c) async =>
            handed.add(c as FakeP2pClient),
      );
      addTearDown(m.dispose);

      await m.initialize();
      expect(handed.length, 1);

      m
        ..noteFailure('NoHostsFound')
        ..noteFailure('NoHostsFound')
        ..noteFailure('NoHostsFound');
      await m.scan();

      expect(handed.length, 2);
      expect(identical(handed[0], handed[1]), isFalse,
          reason: 'recovery must hand over a genuinely new instance');
    });
  });

  group('health snapshot', () {
    test('counts attempts, successes, failures and recoveries', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      )..failConnectOnCall = <int>{2};

      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: _fast,
        clientFactory: () => fake,
      );
      addTearDown(m.dispose);
      await m.initialize();

      await m.connect(fakeDevice('AA'));
      await m.disconnect();
      await m.connect(fakeDevice('AA')); // fails
      await m.connect(fakeDevice('AA'));

      final ConnectionHealth h = m.health;
      expect(h.totalAttempts, 3);
      expect(h.totalSuccesses, 2);
      expect(h.successRate, closeTo(66.7, 0.1));
      expect(h.recoveryCount, 0);
      expect(h.timeInCurrentState, isNotNull);
    });

    test('notifies listeners on every transition', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      );
      final ConnectionManager m = ConnectionManager(
        username: 'test',
        tuning: _fast,
        clientFactory: () => fake,
      );
      addTearDown(m.dispose);

      int notifications = 0;
      m.addListener(() => notifications++);

      await m.initialize();
      await m.connect(fakeDevice('AA'));
      await m.disconnect();

      expect(notifications, greaterThan(2));
    });
  });
}
