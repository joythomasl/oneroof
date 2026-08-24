import 'package:flutter/foundation.dart';

import 'mesh_message.dart';

/// Every message this node holds, keyed by id.
///
/// In-memory for now. The interface is deliberately narrow and id-centric so a
/// SQLite (or Drift/Isar) implementation can replace the backing map without
/// touching the sync protocol or the UI: [digest], [missingFrom] and [add] are
/// the only three operations the protocol needs, and each maps directly onto a
/// single indexed query.
//
// TODO(persistence): back this with SQLite. Messages currently die with the
// process, which defeats store-and-forward across an app restart. Index on
// (priority, createdAt) for missingFrom() and on id for dedupe.
class MessageStore extends ChangeNotifier {
  final Map<String, MeshMessage> _byId = <String, MeshMessage>{};

  /// Sync push order: priority ascending (0 first), then oldest first, then id
  /// as a deterministic tiebreak.
  ///
  /// The id tiebreak matters more than it looks: two messages created in the
  /// same millisecond on different devices must be ordered identically on
  /// every node, or two peers will disagree about what they have already
  /// exchanged. The browser simulation must use this same comparator.
  static int _syncOrder(MeshMessage a, MeshMessage b) {
    final int byPriority = a.priority.compareTo(b.priority);
    if (byPriority != 0) return byPriority;
    final int byAge = a.createdAt.compareTo(b.createdAt);
    if (byAge != 0) return byAge;
    return a.id.compareTo(b.id);
  }

  /// Newest-first order, for display only.
  static int _newestFirst(MeshMessage a, MeshMessage b) {
    final int byAge = b.createdAt.compareTo(a.createdAt);
    if (byAge != 0) return byAge;
    return a.id.compareTo(b.id);
  }

  /// Inserts [m] unless its id is already held. No-op on duplicates —
  /// re-delivery of the same message is normal on a mesh, not an error.
  void add(MeshMessage m) => _insert(m);

  /// Adds a message from its JSON string form.
  ///
  /// Returns `true` if it was genuinely new, `false` if it was a duplicate.
  /// Throws [FormatException] on malformed input so the caller can log the bad
  /// frame rather than silently dropping it.
  bool addFromJson(String json) => _insert(MeshMessage.decode(json));

  bool _insert(MeshMessage m) {
    if (_byId.containsKey(m.id)) return false;
    _byId[m.id] = m;
    notifyListeners();
    return true;
  }

  /// True if this node already holds [id].
  bool contains(String id) => _byId.containsKey(id);

  /// Every id currently held — the payload of a DIGEST frame.
  ///
  /// Order is not significant; the receiver treats it as a set.
  List<String> digest() => _byId.keys.toList(growable: false);

  /// What this node holds that [theirIds] does not, in push order.
  ///
  /// This is the whole of the anti-entropy comparison: a set difference. It
  /// carries no notion of "since when", which is what lets it recover from an
  /// arbitrarily long partition — a node that was dark for six hours gets
  /// exactly the messages it missed, regardless of when it went dark.
  List<MeshMessage> missingFrom(Set<String> theirIds) {
    final List<MeshMessage> missing = <MeshMessage>[
      for (final MeshMessage m in _byId.values)
        if (!theirIds.contains(m.id)) m,
    ]..sort(_syncOrder);
    return missing;
  }

  /// All messages, newest first, for the UI.
  List<MeshMessage> get all =>
      _byId.values.toList(growable: false)..sort(_newestFirst);

  /// Messages this node has not yet handed to the server, in push order.
  List<MeshMessage> get unsynced => <MeshMessage>[
        for (final MeshMessage m in _byId.values)
          if (!m.synced) m,
      ]..sort(_syncOrder);

  /// Marks [ids] as delivered to the server. Ids not held are ignored.
  void markSynced(Iterable<String> ids) {
    bool changed = false;
    for (final String id in ids) {
      final MeshMessage? m = _byId[id];
      if (m != null && !m.synced) {
        m.synced = true;
        changed = true;
      }
    }
    if (changed) notifyListeners();
  }

  int get count => _byId.length;

  /// How many messages are still pending upload. Counts without allocating,
  /// since the UI asks on every rebuild.
  int get unsyncedCount {
    int n = 0;
    for (final MeshMessage m in _byId.values) {
      if (!m.synced) n++;
    }
    return n;
  }

  /// Test/demo hook: empties the store.
  void clear() {
    if (_byId.isEmpty) return;
    _byId.clear();
    notifyListeners();
  }
}
