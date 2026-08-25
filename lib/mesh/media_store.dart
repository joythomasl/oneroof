import 'dart:io';

/// Local full-resolution incident evidence, addressed by its SHA-256 digest.
///
/// Metadata messages deliberately carry only a tiny preview. A later media
/// transfer can request the bytes here at mesh priority 4 without delaying the
/// life-safety report itself.
class MediaStore {
  MediaStore._();

  static final MediaStore instance = MediaStore._();

  final Map<String, File> _files = <String, File>{};

  void put(String sha256, File file) => _files[sha256] = file;

  File? find(String sha256) => _files[sha256];
}
