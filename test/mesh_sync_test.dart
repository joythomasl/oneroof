// Executable specification for the anti-entropy sync algorithm.
//
// The browser simulation of this protocol should be able to reproduce every
// assertion in this file. Nothing here touches Flutter or the P2P plugin —
// it is pure store + protocol.

import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:oneroof/mesh/mesh_message.dart';
import 'package:oneroof/mesh/message_store.dart';
import 'package:oneroof/mesh/sync_protocol.dart';

/// A simulated node: a store, an outbox, and a log.
class _Node {
  _Node(this.name);

  final String name;
  final MessageStore store = MessageStore();
  final List<String> outbox = <String>[];
  final List<String> log = <String>[];

  Future<void> send(String raw) async => outbox.add(raw);
}

const SyncProtocol _p = SyncProtocol();

/// Hands everything in [from]'s outbox to [to], which may reply into its own.
Future<void> _deliver(_Node from, _Node to) async {
  final List<String> frames = List<String>.of(from.outbox);
  from.outbox.clear();
  for (final String frame in frames) {
    await _p.handleFrame(frame, to.store, to.send, to.log.add);
  }
}

DateTime _t(int second) => DateTime.utc(2026, 8, 24, 12, 0, second);

MeshMessage _msg(
  String id,
  String type,
  int priority,
  DateTime createdAt, {
  bool synced = false,
}) {
  return MeshMessage(
    id: id,
    type: type,
    priority: priority,
    originDevice: 'device-a',
    originUser: 'RESP-1',
    createdAt: createdAt,
    seq: 1,
    payload: <String, dynamic>{'note': type},
    synced: synced,
  );
}

/// Kinds of every frame a node emitted, for asserting on traffic shape.
List<String> _kinds(List<String> frames) => <String>[
      for (final String f in frames)
        (jsonDecode(f) as Map<String, dynamic>)['kind'] as String,
    ];

void main() {
  group('MeshMessage', () {
    test('survives a JSON round trip', () {
      final MeshMessage original = _msg('id-1', 'SOS', 0, _t(5));
      final MeshMessage restored = MeshMessage.decode(original.encode());

      expect(restored.id, original.id);
      expect(restored.type, original.type);
      expect(restored.priority, original.priority);
      expect(restored.originDevice, original.originDevice);
      expect(restored.originUser, original.originUser);
      expect(restored.createdAt, original.createdAt);
      expect(restored.seq, original.seq);
      expect(restored.payload, original.payload);
    });

    test('create() assigns id, UTC timestamp and a monotonic seq', () {
      MeshMessage.resetSequences();
      final MeshMessage first = MeshMessage.create(
        type: MeshMessageType.sos.wireName,
        originDevice: 'dev',
        originUser: 'user',
      );
      final MeshMessage second = MeshMessage.create(
        type: MeshMessageType.sos.wireName,
        originDevice: 'dev',
        originUser: 'user',
      );

      expect(first.id, isNotEmpty);
      expect(first.id, isNot(second.id));
      expect(first.createdAt.isUtc, isTrue);
      expect(second.seq, first.seq + 1);
    });

    test('type defaults carry the right priority band', () {
      expect(defaultPriorityFor('SOS'), 0);
      expect(defaultPriorityFor('BACKUP_REQUEST'), 0);
      expect(defaultPriorityFor('STATE_CHANGE'), 1);
      expect(defaultPriorityFor('INCIDENT_REPORT'), 2);
      expect(defaultPriorityFor('STATUS_UPDATE'), 3);
      // Unknown types must never outrank a known SOS.
      expect(defaultPriorityFor('SOMETHING_NEWER'), MeshPriority.lowest);
    });

    test('equality is by id alone', () {
      final MeshMessage a = _msg('same', 'SOS', 0, _t(1));
      final MeshMessage b = _msg('same', 'STATUS_UPDATE', 3, _t(9));
      expect(a, b);
      expect(a.hashCode, b.hashCode);
    });

    test('synced never goes on the wire', () {
      final MeshMessage sent = _msg('id-1', 'SOS', 0, _t(1), synced: true);
      expect(sent.toJson().containsKey('synced'), isFalse);
      expect(MeshMessage.decode(sent.encode()).synced, isFalse);
    });
  });

  group('MessageStore', () {
    test('dedupes by id', () {
      final MessageStore store = MessageStore();
      store.add(_msg('id-1', 'SOS', 0, _t(1)));
      store.add(_msg('id-1', 'SOS', 0, _t(1)));

      expect(store.count, 1);
      expect(store.addFromJson(_msg('id-1', 'SOS', 0, _t(1)).encode()), isFalse);
      expect(store.addFromJson(_msg('id-2', 'SOS', 0, _t(1)).encode()), isTrue);
      expect(store.count, 2);
    });

    test('missingFrom returns the set difference in priority then age order',
        () {
      final MessageStore store = MessageStore();
      store.add(_msg('low-late', 'STATUS_UPDATE', 3, _t(40)));
      store.add(_msg('urgent', 'SOS', 0, _t(30)));
      store.add(_msg('mid', 'INCIDENT_REPORT', 2, _t(20)));
      store.add(_msg('low-early', 'STATUS_UPDATE', 3, _t(10)));
      store.add(_msg('known', 'SOS', 0, _t(1)));

      final List<MeshMessage> missing =
          store.missingFrom(<String>{'known', 'not-mine'});

      expect(
        missing.map((MeshMessage m) => m.id).toList(),
        <String>['urgent', 'mid', 'low-early', 'low-late'],
      );
    });

    test('markSynced flips only the ids it is given', () {
      final MessageStore store = MessageStore();
      store.add(_msg('id-1', 'SOS', 0, _t(1)));
      store.add(_msg('id-2', 'SOS', 0, _t(2)));

      expect(store.unsyncedCount, 2);
      store.markSynced(<String>['id-1', 'never-heard-of-it']);
      expect(store.unsyncedCount, 1);
      expect(store.unsynced.single.id, 'id-2');
    });

    test('notifies listeners on insert and on markSynced', () {
      final MessageStore store = MessageStore();
      int notifications = 0;
      store.addListener(() => notifications++);

      store.add(_msg('id-1', 'SOS', 0, _t(1)));
      expect(notifications, 1);

      store.add(_msg('id-1', 'SOS', 0, _t(1))); // duplicate, silent
      expect(notifications, 1);

      store.markSynced(<String>['id-1']);
      expect(notifications, 2);

      store.markSynced(<String>['id-1']); // already synced, silent
      expect(notifications, 2);
    });

    test('all is newest first', () {
      final MessageStore store = MessageStore();
      store.add(_msg('old', 'SOS', 0, _t(1)));
      store.add(_msg('new', 'SOS', 0, _t(9)));
      store.add(_msg('mid', 'SOS', 0, _t(5)));

      expect(store.all.map((MeshMessage m) => m.id).toList(),
          <String>['new', 'mid', 'old']);
    });
  });

  group('SyncProtocol', () {
    test('a digest exchange in both directions converges two nodes', () async {
      final _Node a = _Node('A');
      final _Node b = _Node('B');

      final MeshMessage shared = _msg('shared', 'SOS', 0, _t(1));
      a.store.add(shared);
      b.store.add(shared);
      a.store.add(_msg('a-only-1', 'INCIDENT_REPORT', 2, _t(2)));
      a.store.add(_msg('a-only-2', 'STATUS_UPDATE', 3, _t(3)));
      b.store.add(_msg('b-only-1', 'BACKUP_REQUEST', 0, _t(4)));

      // A announces what it has; B pushes back the one thing A lacks.
      a.outbox.add(_p.buildDigest(a.store));
      await _deliver(a, b);
      await _deliver(b, a);

      // Then the same in the other direction.
      b.outbox.add(_p.buildDigest(b.store));
      await _deliver(b, a);
      await _deliver(a, b);

      expect(a.store.count, 4);
      expect(b.store.count, 4);
      expect(a.store.digest().toSet(), b.store.digest().toSet());
    });

    test('a node dark for a long partition catches up in one exchange',
        () async {
      final _Node online = _Node('online');
      final _Node dark = _Node('dark');

      // 20 messages accumulated while `dark` was away.
      for (int i = 0; i < 20; i++) {
        online.store.add(_msg('m-$i', 'INCIDENT_REPORT', 2, _t(i)));
      }
      expect(dark.store.count, 0);

      dark.outbox.add(_p.buildDigest(dark.store));
      await _deliver(dark, online);
      await _deliver(online, dark);

      expect(dark.store.count, 20);
    });

    test('pushes in priority order, most urgent first', () async {
      final _Node asker = _Node('asker');
      final _Node holder = _Node('holder');

      holder.store.add(_msg('routine', 'STATUS_UPDATE', 3, _t(1)));
      holder.store.add(_msg('report', 'INCIDENT_REPORT', 2, _t(2)));
      holder.store.add(_msg('mayday', 'SOS', 0, _t(3)));

      asker.outbox.add(_p.buildDigest(asker.store));
      await _deliver(asker, holder);

      final List<String> pushedIds = <String>[
        for (final String frame in holder.outbox)
          ((jsonDecode(frame) as Map<String, dynamic>)['message']
              as Map<String, dynamic>)['id'] as String,
      ];
      expect(pushedIds, <String>['mayday', 'report', 'routine']);
      expect(holder.log, contains('> pushed 3 message(s)'));
    });

    test('receiving a MSG never emits a frame — no re-broadcast', () async {
      final _Node sender = _Node('sender');
      final _Node receiver = _Node('receiver');

      sender.outbox.add(_p.buildMessageFrame(_msg('id-1', 'SOS', 0, _t(1))));
      await _deliver(sender, receiver);

      expect(receiver.store.count, 1);
      expect(receiver.outbox, isEmpty);
      expect(receiver.log.single, contains('received 1 new message'));
    });

    test('a duplicate MSG is absorbed silently', () async {
      final _Node sender = _Node('sender');
      final _Node receiver = _Node('receiver');
      receiver.store.add(_msg('id-1', 'SOS', 0, _t(1)));

      sender.outbox.add(_p.buildMessageFrame(_msg('id-1', 'SOS', 0, _t(1))));
      await _deliver(sender, receiver);

      expect(receiver.store.count, 1);
      expect(receiver.outbox, isEmpty);
      expect(receiver.log.single, contains('duplicate, ignored'));
    });

    test('a digest from an up-to-date peer pushes nothing', () async {
      final _Node a = _Node('A');
      final _Node b = _Node('B');
      final MeshMessage shared = _msg('shared', 'SOS', 0, _t(1));
      a.store.add(shared);
      b.store.add(shared);

      a.outbox.add(_p.buildDigest(a.store));
      await _deliver(a, b);

      expect(_kinds(b.outbox), isEmpty);
      expect(b.log, contains('> pushed 0 message(s)'));
    });

    test('ACK marks the named ids synced', () async {
      final _Node sender = _Node('sender');
      final _Node receiver = _Node('receiver');
      receiver.store.add(_msg('id-1', 'SOS', 0, _t(1)));
      receiver.store.add(_msg('id-2', 'SOS', 0, _t(2)));

      sender.outbox.add(_p.buildAck(<String>['id-1']));
      await _deliver(sender, receiver);

      expect(receiver.store.unsyncedCount, 1);
      expect(receiver.store.unsynced.single.id, 'id-2');
    });

    test('unknown, malformed and truncated frames are logged, never thrown',
        () async {
      final _Node n = _Node('N');

      await _p.handleFrame(
          '{"kind":"FUTURE_KIND","x":1}', n.store, n.send, n.log.add);
      await _p.handleFrame('not json at all', n.store, n.send, n.log.add);
      await _p.handleFrame('[1,2,3]', n.store, n.send, n.log.add);
      await _p.handleFrame('{"no":"kind"}', n.store, n.send, n.log.add);
      await _p.handleFrame('{"kind":"MSG"}', n.store, n.send, n.log.add);
      await _p.handleFrame(
          '{"kind":"MSG","message":{"nope":true}}', n.store, n.send, n.log.add);

      expect(n.store.count, 0);
      expect(n.outbox, isEmpty);
      expect(n.log.length, 6);
      expect(n.log.first, contains('unknown frame kind "FUTURE_KIND"'));
    });

    test('a push failure stops the batch and leaves the rest for next time',
        () async {
      final MessageStore store = MessageStore();
      for (int i = 0; i < 5; i++) {
        store.add(_msg('m-$i', 'INCIDENT_REPORT', 2, _t(i)));
      }
      final List<String> log = <String>[];
      int sent = 0;

      Future<void> failingSend(String raw) async {
        sent++;
        if (sent == 3) throw StateError('link dropped');
      }

      await _p.handleFrame(
        _p.buildDigest(MessageStore()), // peer has nothing
        store,
        failingSend,
        log.add,
      );

      expect(log, contains('> pushed 2 message(s)'));
      // Nothing is lost: the store is untouched, so the next digest exchange
      // re-offers the three that did not make it.
      expect(store.count, 5);
    });
  });
}
