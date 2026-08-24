import 'dart:convert';

import 'package:uuid/uuid.dart';

/// Priority bands carried in [MeshMessage.priority].
///
/// Lower number = more urgent = pushed earlier during a sync. The whole point
/// of the band is ordering under scarcity: when two nodes have a brief window
/// of contact, the SOS goes across before the location pings.
abstract final class MeshPriority {
  /// SOS and backup requests — someone is in danger.
  static const int sosOrBackup = 0;

  /// State changes and tasking — who is doing what, area state transitions.
  static const int stateOrTasking = 1;

  /// Incident reports filed from the field.
  static const int incidentReport = 2;

  /// Routine status and location updates.
  static const int statusOrLocation = 3;

  /// Photos, audio, anything large. No message type uses this band yet; it is
  /// reserved so media never displaces text when bandwidth is tight.
  static const int media = 4;

  static const int lowest = media;
}

/// The message types the mesh carries, each with the priority band it
/// defaults to, so callers never have to remember the numbers.
enum MeshMessageType {
  sos('SOS', MeshPriority.sosOrBackup, 'SOS'),
  backupRequest('BACKUP_REQUEST', MeshPriority.sosOrBackup, 'Backup request'),
  stateChange('STATE_CHANGE', MeshPriority.stateOrTasking, 'State change'),
  incidentReport(
      'INCIDENT_REPORT', MeshPriority.incidentReport, 'Incident report'),
  statusUpdate('STATUS_UPDATE', MeshPriority.statusOrLocation, 'Status update');

  const MeshMessageType(this.wireName, this.defaultPriority, this.label);

  /// Value that goes into [MeshMessage.type] and onto the wire.
  final String wireName;

  /// Priority band assigned when the caller does not override it.
  final int defaultPriority;

  /// Human-readable name, for pickers and lists.
  final String label;

  /// Looks up a type by its wire name, or `null` if unrecognised.
  static MeshMessageType? fromWire(String wireName) {
    for (final MeshMessageType t in MeshMessageType.values) {
      if (t.wireName == wireName) return t;
    }
    return null;
  }
}

/// Default priority for a wire type name.
///
/// Unknown types fall to [MeshPriority.lowest] deliberately: a node running a
/// newer build may introduce a type this build has never heard of, and an
/// unknown message must never be able to jump ahead of a known SOS.
int defaultPriorityFor(String type) =>
    MeshMessageType.fromWire(type)?.defaultPriority ?? MeshPriority.lowest;

/// A single message replicated across the mesh.
///
/// WIRE FORMAT — the browser simulation must match this exactly:
/// ```json
/// {
///   "id": "9f1c...",              // uuid v4, assigned by the origin device
///   "type": "INCIDENT_REPORT",    // see MeshMessageType.wireName
///   "priority": 2,                // 0..4, lower is more urgent
///   "originDevice": "3ab8...",    // device id of the node that created it
///   "originUser": "RESP-DELTA-12",
///   "createdAt": "2026-08-24T14:03:11.412Z",  // ISO-8601, always UTC
///   "seq": 7,                     // per-origin-device monotonic counter
///   "payload": { ... }            // opaque to the sync layer
/// }
/// ```
///
/// [synced] is deliberately NOT on the wire. It means "this node has handed
/// the message to the server", which is local bookkeeping — node A having
/// uploaded a message says nothing about node B. Sync state spreads through
/// ACK frames instead (see `sync_protocol.dart`).
///
/// Messages are immutable apart from [synced]; nothing else is ever rewritten
/// after creation, which is what makes id-based dedupe safe.
class MeshMessage {
  MeshMessage({
    required this.id,
    required this.type,
    required this.priority,
    required this.originDevice,
    required this.originUser,
    required this.createdAt,
    required this.seq,
    required this.payload,
    this.synced = false,
  });

  /// Creates a brand-new message originating on this device, auto-assigning
  /// [id] (uuid v4), [createdAt] (UTC now) and [seq].
  ///
  /// Pass [priority] only to override the type's default band.
  factory MeshMessage.create({
    required String type,
    required String originDevice,
    required String originUser,
    Map<String, dynamic> payload = const <String, dynamic>{},
    int? priority,
  }) {
    return MeshMessage(
      id: const Uuid().v4(),
      type: type,
      priority: priority ?? defaultPriorityFor(type),
      originDevice: originDevice,
      originUser: originUser,
      createdAt: DateTime.now().toUtc(),
      seq: _nextSeq(originDevice),
      payload: payload,
    );
  }

  /// Rebuilds a message from its decoded wire form.
  factory MeshMessage.fromJson(Map<String, dynamic> json) {
    final String type = json['type'] as String? ?? 'UNKNOWN';
    return MeshMessage(
      id: json['id'] as String,
      type: type,
      priority: (json['priority'] as num?)?.toInt() ?? defaultPriorityFor(type),
      originDevice: json['originDevice'] as String? ?? 'unknown',
      originUser: json['originUser'] as String? ?? 'unknown',
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '')
              ?.toUtc() ??
          DateTime.now().toUtc(),
      seq: (json['seq'] as num?)?.toInt() ?? 0,
      payload: (json['payload'] as Map<String, dynamic>?) ??
          <String, dynamic>{},
      // Always false: see the class doc — sync state does not travel on MSG.
    );
  }

  /// Decodes a message from its JSON string form.
  factory MeshMessage.decode(String raw) {
    final Object? decoded = jsonDecode(raw);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('MeshMessage JSON must be an object');
    }
    return MeshMessage.fromJson(decoded);
  }

  final String id;
  final String type;
  final int priority;
  final String originDevice;
  final String originUser;
  final DateTime createdAt;
  final int seq;
  final Map<String, dynamic> payload;

  /// Whether this node has delivered the message to the server. Local only —
  /// mutable because it is the one fact about a message that can change.
  bool synced;

  /// Per-device monotonic sequence numbers.
  ///
  /// Only ever assigned for messages this device originates, so the counter is
  /// keyed by device purely as a safety net. It resets on app restart, in step
  /// with the device id — see [MeshMessage.seq] below.
  static final Map<String, int> _seqByDevice = <String, int>{};

  static int _nextSeq(String device) {
    final int next = (_seqByDevice[device] ?? 0) + 1;
    _seqByDevice[device] = next;
    return next;
  }

  /// Resets the sequence counters. Test hook only.
  static void resetSequences() => _seqByDevice.clear();

  /// The wire form as a map, ready to embed in a sync frame.
  ///
  /// Note the absent `synced` key — that is intentional, not an oversight.
  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'type': type,
        'priority': priority,
        'originDevice': originDevice,
        'originUser': originUser,
        'createdAt': createdAt.toUtc().toIso8601String(),
        'seq': seq,
        'payload': payload,
      };

  /// The wire form as a JSON string.
  String encode() => jsonEncode(toJson());

  MeshMessage copyWith({bool? synced}) => MeshMessage(
        id: id,
        type: type,
        priority: priority,
        originDevice: originDevice,
        originUser: originUser,
        createdAt: createdAt,
        seq: seq,
        payload: payload,
        synced: synced ?? this.synced,
      );

  /// The type as an enum, or `null` if this build does not know it.
  MeshMessageType? get typeOrNull => MeshMessageType.fromWire(type);

  /// Identity is the id alone. Two nodes holding "the same" message hold
  /// byte-identical copies, so nothing else needs comparing — and dedupe on
  /// arrival depends on exactly this.
  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is MeshMessage && other.id == id);

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() =>
      'MeshMessage($type p$priority #${id.substring(0, 8)} seq=$seq)';
}
