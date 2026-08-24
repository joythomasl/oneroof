import 'package:uuid/uuid.dart';

/// Identity of this physical device on the mesh.
///
/// The id is a uuid v4 generated once per app launch and held for the life of
/// the process, so every frame this device originates carries the same
/// `originDevice`.
///
/// NOTE FOR THE BROWSER SIMULATION: a simulated node needs the same property —
/// one stable id per node for the whole run. Nothing in the sync algorithm
/// depends on the id being a uuid specifically; it only has to be unique
/// across nodes.
//
// TODO(persistence): this regenerates on every launch, so a phone that
// restarts mid-incident looks like a brand-new node to its peers (its stored
// messages still sync fine — only the origin attribution changes). Persist it
// to shared preferences / secure storage once a storage dependency lands.
abstract final class DeviceIdentity {
  static final String deviceId = const Uuid().v4();

  /// Responder this device is signed in as.
  // TODO(backend): take this from the authenticated session instead.
  static const String userId = 'RESP-DELTA-12';

  /// Called from `main()` so the id is fixed at app start rather than being
  /// created lazily by whichever screen happens to touch it first.
  static String initialise() => deviceId;

  /// First 8 characters, upper-cased — short enough to read off a phone screen
  /// at a glance, long enough to tell three test devices apart.
  static String get shortDeviceId => shorten(deviceId);

  /// Shortens any mesh id (device id, message id) for display.
  static String shorten(String id) =>
      id.length <= 8 ? id.toUpperCase() : id.substring(0, 8).toUpperCase();
}
