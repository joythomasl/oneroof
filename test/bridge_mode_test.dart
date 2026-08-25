// Behavioural spec for Bridge Mode.
//
// The claim being made on stage is "this message was picked up at A and
// delivered to B". These tests exist so that claim is exact rather than
// inferred — most importantly that one message crossing counts as one relay,
// never two.

import 'dart:async';
import 'dart:convert';

import 'package:flutter_p2p_connection/flutter_p2p_connection.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:oneroof/mesh/bridge_mode.dart';
import 'package:oneroof/mesh/connection_manager.dart';
import 'package:oneroof/mesh/mesh_message.dart';
import 'package:oneroof/mesh/message_store.dart';
import 'package:oneroof/mesh/sync_protocol.dart';

import 'fake_p2p_client.dart';

const SyncProtocol _protocol = SyncProtocol();

/// Sub-second policy so hops run at test speed.
const ConnectionTuning _fast = ConnectionTuning(
  scanTimeout: Duration(milliseconds: 30),
  connectTimeout: Duration(milliseconds: 30),
  cooldown: Duration(milliseconds: 5),
  backoffBase: Duration(milliseconds: 1),
  backoffCap: Duration(milliseconds: 10),
  failureThreshold: 99,
  recoveryPause: Duration(milliseconds: 5),
  scanWatchdog: Duration(milliseconds: 300),
  connectWatchdog: Duration(milliseconds: 300),
  disconnectWatchdog: Duration(milliseconds: 300),
);

MeshMessage _message(String id) => MeshMessage(
      id: id,
      type: MeshMessageType.incidentReport.wireName,
      priority: 2,
      originDevice: 'origin',
      originUser: 'RESP-1',
      createdAt: DateTime.utc(2026, 8, 25, 12),
      seq: 1,
      payload: const <String, dynamic>{},
    );

String _msgFrame(MeshMessage m) => _protocol.buildMessageFrame(m);

/// Builds a bridge over a fake radio.
({BridgeMode bridge, ConnectionManager connection, MessageStore store})
    _harness(FakeP2pClient fake) {
  final ConnectionManager connection = ConnectionManager(
    username: 'bridge',
    tuning: _fast,
    clientFactory: () => fake,
  );
  final MessageStore store = MessageStore();
  final BridgeMode bridge = BridgeMode(
    connection: connection,
    store: store,
    protocol: _protocol,
    syncSettle: const Duration(milliseconds: 10),
    settleDelay: const Duration(milliseconds: 5),
  );
  return (bridge: bridge, connection: connection, store: store);
}

void main() {
  group('relay provenance', () {
    test('in from A and out to B is exactly one relay', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[
          fakeDevice('AA'),
          fakeDevice('BB'),
        ],
      );
      final harness = _harness(fake);
      addTearDown(harness.connection.dispose);
      await harness.connection.initialize();

      final List<BridgeEvent> delivered = <BridgeEvent>[];
      harness.bridge.events
          .where((BridgeEvent e) => e.kind == BridgeEventKind.delivered)
          .listen(delivered.add);

      final MeshMessage carried = _message('msg-1');

      // Hop 1: standing at host A, which pushes us a message.
      unawaited(harness.bridge.start(targets: <BleDiscoveredDevice>[
        fakeDevice('AA'),
        fakeDevice('BB'),
      ]));
      await _until(() => harness.bridge.currentTarget == 'host-AA');
      await harness.bridge.handleFrame(_msgFrame(carried));
      expect(harness.store.count, 1);
      expect(harness.bridge.relaysCompleted, 0,
          reason: 'picking a message up is not yet a relay');

      // Hop 2: at host B, whose digest shows it has nothing — so we push.
      await _until(() => harness.bridge.currentTarget == 'host-BB');
      await harness.bridge.handleFrame(
        jsonEncode(<String, dynamic>{'kind': 'DIGEST', 'ids': <String>[]}),
      );

      expect(harness.bridge.relaysCompleted, 1);
      // The counter updates synchronously; the broadcast stream delivers on a
      // microtask, so wait for the event rather than racing it.
      await _until(() => delivered.isNotEmpty);
      expect(delivered.length, 1);
      expect(delivered.single.messageId, 'msg-1');
      expect(delivered.single.sourceHost, 'host-AA');
      expect(delivered.single.destinationHost, 'host-BB');

      // Pushed again on a later pass: still one relay, not two.
      await harness.bridge.handleFrame(
        jsonEncode(<String, dynamic>{'kind': 'DIGEST', 'ids': <String>[]}),
      );
      expect(harness.bridge.relaysCompleted, 1,
          reason: 'a re-push of the same id must not double-count');

      await harness.bridge.stop();
    });

    test('handing a message back where it came from is not a relay', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA'), fakeDevice('BB')],
      );
      final harness = _harness(fake);
      addTearDown(harness.connection.dispose);
      await harness.connection.initialize();

      unawaited(harness.bridge.start(targets: <BleDiscoveredDevice>[
        fakeDevice('AA'),
        fakeDevice('BB'),
      ]));
      await _until(() => harness.bridge.currentTarget == 'host-AA');

      await harness.bridge.handleFrame(_msgFrame(_message('msg-1')));
      // Still at A, and A asks for what it lacks.
      await harness.bridge.handleFrame(
        jsonEncode(<String, dynamic>{'kind': 'DIGEST', 'ids': <String>[]}),
      );

      expect(harness.bridge.relaysCompleted, 0,
          reason: 'A -> A is a re-send, not a relay');
      await harness.bridge.stop();
    });

    test('a message this node originated is carried, not relayed', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA'), fakeDevice('BB')],
      );
      final harness = _harness(fake);
      addTearDown(harness.connection.dispose);
      await harness.connection.initialize();

      // In the store before any hop, so it has no source host.
      harness.store.add(_message('mine-1'));

      unawaited(harness.bridge.start(targets: <BleDiscoveredDevice>[
        fakeDevice('AA'),
        fakeDevice('BB'),
      ]));
      await _until(() => harness.bridge.currentTarget == 'host-AA');
      await harness.bridge.handleFrame(
        jsonEncode(<String, dynamic>{'kind': 'DIGEST', 'ids': <String>[]}),
      );

      expect(harness.bridge.relaysCompleted, 0,
          reason: 'we were the source, so nothing was relayed');
      await harness.bridge.stop();
    });

    test('recent relays read as "#id: from -> to"', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA'), fakeDevice('BB')],
      );
      final harness = _harness(fake);
      addTearDown(harness.connection.dispose);
      await harness.connection.initialize();

      unawaited(harness.bridge.start(targets: <BleDiscoveredDevice>[
        fakeDevice('AA'),
        fakeDevice('BB'),
      ]));
      await _until(() => harness.bridge.currentTarget == 'host-AA');
      await harness.bridge.handleFrame(_msgFrame(_message('abcd1234-rest')));
      await _until(() => harness.bridge.currentTarget == 'host-BB');
      await harness.bridge.handleFrame(
        jsonEncode(<String, dynamic>{'kind': 'DIGEST', 'ids': <String>[]}),
      );

      final RelayRecord record = harness.bridge.recentRelays.first;
      expect(record.summary, '#ABCD1234: host-AA → host-BB');
      expect(record.from, 'host-AA');
      expect(record.to, 'host-BB');
      await harness.bridge.stop();
    });
  });

  group('targeting', () {
    test('rotates round-robin across the targets', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[
          fakeDevice('AA'),
          fakeDevice('BB'),
          fakeDevice('CC'),
        ],
      );
      final harness = _harness(fake);
      addTearDown(harness.connection.dispose);
      await harness.connection.initialize();

      unawaited(harness.bridge.start(targets: <BleDiscoveredDevice>[
        fakeDevice('AA'),
        fakeDevice('BB'),
        fakeDevice('CC'),
      ]));
      await _until(() => fake.connectedTo.length >= 6);
      await harness.bridge.stop();

      expect(
        fake.connectedTo.take(6).toList(),
        <String>['AA', 'BB', 'CC', 'AA', 'BB', 'CC'],
      );
    });

    test('refuses to start with fewer than two hosts', () async {
      final FakeP2pClient fake = FakeP2pClient();
      final harness = _harness(fake);
      addTearDown(harness.connection.dispose);
      await harness.connection.initialize();

      // A bridge with one end is not a bridge.
      expect(
        () => harness.bridge.start(
            targets: <BleDiscoveredDevice>[fakeDevice('AA')]),
        throwsArgumentError,
      );
      expect(harness.bridge.isRunning, isFalse);
    });

    test('a host out of range is reported and the loop continues', () async {
      // Only AA answers; BB is never in range.
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA')],
      );
      final harness = _harness(fake);
      addTearDown(harness.connection.dispose);
      await harness.connection.initialize();

      final List<BridgeEvent> failures = <BridgeEvent>[];
      harness.bridge.events
          .where((BridgeEvent e) => e.kind == BridgeEventKind.failed)
          .listen(failures.add);

      unawaited(harness.bridge.start(targets: <BleDiscoveredDevice>[
        fakeDevice('AA'),
        fakeDevice('BB'),
      ]));
      await _until(() => failures.isNotEmpty);
      await harness.bridge.stop();

      expect(failures.first.targetName, 'host-BB');
      expect(failures.first.errorType, 'OutOfRange');
      // The near host still got visited.
      expect(fake.connectedTo, contains('AA'));
    });
  });

  group('lifecycle', () {
    test('stop() halts mid-cycle and leaves the radio released', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA'), fakeDevice('BB')],
      );
      final ConnectionManager connection = ConnectionManager(
        username: 'bridge',
        tuning: _fast,
        clientFactory: () => fake,
      );
      addTearDown(connection.dispose);
      await connection.initialize();

      final BridgeMode bridge = BridgeMode(
        connection: connection,
        store: MessageStore(),
        protocol: _protocol,
        syncSettle: const Duration(milliseconds: 10),
        // Long enough that stop() must cut it short rather than wait it out.
        settleDelay: const Duration(seconds: 30),
      );

      final Future<void> run = bridge.start(targets: <BleDiscoveredDevice>[
        fakeDevice('AA'),
        fakeDevice('BB'),
      ]);
      await _until(() => bridge.hopsCompleted >= 1);
      expect(bridge.isRunning, isTrue);

      final Stopwatch sw = Stopwatch()..start();
      await bridge.stop();
      sw.stop();
      await run;

      expect(sw.elapsed, lessThan(const Duration(seconds: 5)),
          reason: 'the settle delay must be interruptible');
      expect(bridge.isRunning, isFalse);
      expect(bridge.currentTarget, isNull);
      expect(connection.isConnected, isFalse);
      expect(fake.disconnectCalls, greaterThan(0));
    });

    test('per-hop latency is measured, not claimed', () async {
      final FakeP2pClient fake = FakeP2pClient(
        discovered: <BleDiscoveredDevice>[fakeDevice('AA'), fakeDevice('BB')],
      );
      final harness = _harness(fake);
      addTearDown(harness.connection.dispose);
      await harness.connection.initialize();

      expect(harness.bridge.perHopLabel, '— per hop');

      unawaited(harness.bridge.start(targets: <BleDiscoveredDevice>[
        fakeDevice('AA'),
        fakeDevice('BB'),
      ]));
      await _until(() => harness.bridge.hopsCompleted >= 2);
      await harness.bridge.stop();

      expect(harness.bridge.meanHopDuration, greaterThan(Duration.zero));
      expect(harness.bridge.perHopLabel, matches(r'^~\d+\.\d+s per hop$'));
    });
  });
}

/// Polls until [condition] holds, with a ceiling so a broken expectation fails
/// the test instead of hanging it.
Future<void> _until(
  bool Function() condition, {
  Duration limit = const Duration(seconds: 10),
}) async {
  final Stopwatch sw = Stopwatch()..start();
  while (!condition()) {
    if (sw.elapsed > limit) {
      fail('condition not met within ${limit.inSeconds}s');
    }
    await Future<void>.delayed(const Duration(milliseconds: 2));
  }
}
