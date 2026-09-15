import 'message_store.dart';

/// The app-wide queue of reports waiting for mesh delivery.
///
/// Both report entry points and the Mesh tab use this one instance: adding a
/// report is therefore enough for the next anti-entropy exchange to carry it.
final MessageStore reportStore = MessageStore();
