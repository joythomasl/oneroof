import 'dart:convert';

import 'device_identity.dart';
import 'mesh_message.dart';
import 'message_store.dart';

/// The three frame kinds that ride on top of `broadcastText()`.
abstract final class SyncFrameKind {
  static const String digest = 'DIGEST';
  static const String message = 'MSG';
  static const String ack = 'ACK';
}

/// Sends one encoded frame over whatever transport is live.
typedef SendFrame = Future<void> Function(String raw);

/// Receives one human-readable line for the on-screen sync log.
typedef LogSink = void Function(String line);

/// Anti-entropy sync over a text transport.
///
/// ## The algorithm, in full
///
/// Every node keeps a [MessageStore] keyed by message id. Two nodes reconcile
/// by set difference, in one round trip per direction:
///
/// 1. On contact, each node sends a **DIGEST** — the complete list of ids it
///    holds.
/// 2. A node receiving a DIGEST computes `missingFrom(their ids)` — everything
///    it holds that the sender did not list — and sends each one back as a
///    **MSG** frame, in priority order (P0 first, then oldest first).
/// 3. A node receiving a MSG inserts it if the id is new, and does nothing at
///    all if the id is already held.
/// 4. **ACK** carries ids that have reached the server, so nodes can stop
///    treating them as pending upload.
///
/// DIGEST is one-directional: it is a statement of *what I have*, which lets
/// the receiver push what I lack. It does not pull anything back. Each side
/// must therefore send its own DIGEST to receive — which is exactly what the
/// mesh screen does, on both the host and the client side, whenever a
/// connection comes up.
///
/// There is no vector clock, no "changes since T", no sequence-window
/// negotiation. That is the point: a set difference has no notion of when a
/// node went dark, so a node that was offline for six hours recovers by the
/// same single exchange as one that blinked for six seconds. [MeshMessage.seq]
/// exists for server-side ordering and debugging; the sync layer never reads
/// it.
///
/// ## Wire format
///
/// ```json
/// {"kind":"DIGEST","ids":["<id>","<id>"]}
/// {"kind":"MSG","message":{ ...MeshMessage json... }}
/// {"kind":"ACK","ids":["<id>","<id>"]}
/// ```
///
/// One JSON object per frame, no framing or length prefix — the transport
/// delivers whole strings. Unknown `kind` values are logged and ignored so a
/// newer build can add frame types without breaking older nodes.
///
/// ## Transport assumptions — READ THIS BEFORE PORTING
///
/// On Wi-Fi Direct the topology is a star: one host, N clients, and the
/// **host relays**. A single `broadcastText()` from any node is delivered to
/// every other node exactly once — the plugin's host transport forwards a
/// client's payload on to the remaining clients. Two consequences:
///
/// * A MSG is **never re-broadcast** on receipt. The transport already fanned
///   it out; re-broadcasting would multiply every message by the number of
///   nodes. If the browser simulation uses point-to-point links instead of a
///   relaying star, it must either add a forwarding rule or let pairwise
///   digest exchange carry messages the extra hop.
/// * A DIGEST is also seen by every node, so in a 3+ node group several peers
///   answer the same digest and the asker receives duplicate MSG frames. That
///   is harmless — dedupe by id absorbs it — and it is why the log
///   distinguishes "1 new message" from "duplicate, ignored".
///
/// The protocol is stateless: no per-peer bookkeeping, nothing to reset
/// between sessions. Two instances of this class behave identically given the
/// same store.
class SyncProtocol {
  const SyncProtocol();

  // --- frame builders ------------------------------------------------------

  /// `{"kind":"DIGEST","ids":[...]}` — every id this node currently holds.
  String buildDigest(MessageStore store) => jsonEncode(<String, dynamic>{
        'kind': SyncFrameKind.digest,
        'ids': store.digest(),
      });

  /// `{"kind":"MSG","message":{...}}` — one full message.
  String buildMessageFrame(MeshMessage message) => jsonEncode(<String, dynamic>{
        'kind': SyncFrameKind.message,
        'message': message.toJson(),
      });

  /// `{"kind":"ACK","ids":[...]}` — these ids reached the server.
  String buildAck(Iterable<String> ids) => jsonEncode(<String, dynamic>{
        'kind': SyncFrameKind.ack,
        'ids': ids.toList(growable: false),
      });

  // --- frame handling ------------------------------------------------------

  /// Handles one inbound frame.
  ///
  /// [raw] is the text as it came off the transport, [store] is this node's
  /// message store, [send] puts a frame back on the wire, and [log] receives
  /// one line per protocol event for the on-screen sync log.
  ///
  /// Never throws: a malformed or unrecognised frame is logged and dropped.
  /// A node with a corrupted or newer-format peer must keep running.
  Future<void> handleFrame(
    String raw,
    MessageStore store,
    SendFrame send,
    LogSink log,
  ) async {
    final Object? decoded;
    try {
      decoded = jsonDecode(raw);
    } on FormatException {
      log('! dropped unparseable frame (${raw.length} bytes)');
      return;
    }

    if (decoded is! Map<String, dynamic>) {
      log('! dropped frame: not a JSON object');
      return;
    }

    final Object? kind = decoded['kind'];
    if (kind is! String) {
      log('! dropped frame: missing "kind"');
      return;
    }

    switch (kind) {
      case SyncFrameKind.digest:
        await _handleDigest(decoded, store, send, log);
      case SyncFrameKind.message:
        _handleMessage(decoded, store, log);
      case SyncFrameKind.ack:
        _handleAck(decoded, store, log);
      default:
        log('? unknown frame kind "$kind" — ignored');
    }
  }

  /// DIGEST: push back everything the sender is missing, most urgent first.
  Future<void> _handleDigest(
    Map<String, dynamic> frame,
    MessageStore store,
    SendFrame send,
    LogSink log,
  ) async {
    final Set<String> theirIds = _idsOf(frame).toSet();
    final List<MeshMessage> missing = store.missingFrom(theirIds);

    log('< DIGEST ${theirIds.length} id(s) — they lack ${missing.length}');

    int pushed = 0;
    for (final MeshMessage m in missing) {
      try {
        await send(buildMessageFrame(m));
        pushed++;
      } catch (e) {
        // The link almost certainly dropped. Stop here rather than grinding
        // through the rest: whatever did not go across is recovered by the
        // next digest exchange, which is the whole promise of anti-entropy.
        log('! push of #${DeviceIdentity.shorten(m.id)} failed: $e');
        break;
      }
    }
    log('> pushed $pushed message(s)');
  }

  /// MSG: insert if new. Never re-broadcast — see the class doc.
  void _handleMessage(
    Map<String, dynamic> frame,
    MessageStore store,
    LogSink log,
  ) {
    final Object? body = frame['message'];
    if (body is! Map<String, dynamic>) {
      log('! dropped MSG: no message body');
      return;
    }

    final String id = body['id'] as String? ?? '';
    final String type = body['type'] as String? ?? 'UNKNOWN';
    final String shortId = id.isEmpty ? '????????' : DeviceIdentity.shorten(id);

    final bool isNew;
    try {
      isNew = store.addFromJson(jsonEncode(body));
    } catch (e) {
      log('! dropped malformed MSG: $e');
      return;
    }

    if (isNew) {
      log('< received 1 new message ($type #$shortId)');
    } else {
      log('< MSG #$shortId — duplicate, ignored');
    }
  }

  /// ACK: these ids are on the server, so stop counting them as pending.
  void _handleAck(
    Map<String, dynamic> frame,
    MessageStore store,
    LogSink log,
  ) {
    final List<String> ids = _idsOf(frame);
    if (ids.isEmpty) {
      log('< ACK with no ids — ignored');
      return;
    }
    store.markSynced(ids);
    log('< ACK ${ids.length} id(s) marked synced');
  }

  /// Reads the `ids` array of a DIGEST or ACK frame, skipping anything that is
  /// not a string rather than rejecting the whole frame.
  static List<String> _idsOf(Map<String, dynamic> frame) {
    final Object? ids = frame['ids'];
    if (ids is! List) return const <String>[];
    return ids.whereType<String>().toList(growable: false);
  }
}
