import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:image/image.dart' as img;

/// The mesh priority used for an incident report severity.
int severityToMeshPriority(String severity) {
  switch (severity.toUpperCase()) {
    case 'P0':
      return 0;
    case 'P1':
      return 1;
    case 'P2':
    case 'P3':
      return 2;
    default:
      throw ArgumentError.value(severity, 'severity', 'Expected P0 through P3');
  }
}

class ProcessedPhoto {
  const ProcessedPhoto({
    required this.file,
    required this.sha256,
    required this.thumbnailBase64,
    required this.sizeBytes,
  });

  final File file;
  final String sha256;
  final String thumbnailBase64;
  final int sizeBytes;
}

/// Resizes camera bytes for a constrained mesh transfer.
///
/// Quality starts at 80 as the product requirement specifies. If a noisy
/// image still exceeds the 300KB operating ceiling, the encoder steps down
/// gently; this protects the 9.4-second bridge cycle rather than trusting a
/// camera's source encoding.
Uint8List downscaleJpeg(Uint8List source) {
  final img.Image? decoded = img.decodeImage(source);
  if (decoded == null) {
    throw const FormatException('Camera image is unreadable');
  }
  final int longest = decoded.width > decoded.height
      ? decoded.width
      : decoded.height;
  final img.Image resized = longest <= 1024
      ? decoded
      : img.copyResize(
          decoded,
          width: decoded.width >= decoded.height ? 1024 : null,
          height: decoded.height > decoded.width ? 1024 : null,
        );
  List<int> encoded = img.encodeJpg(resized, quality: 80);
  for (
    int quality = 75;
    encoded.length > 290 * 1024 && quality >= 35;
    quality -= 5
  ) {
    encoded = img.encodeJpg(resized, quality: quality);
  }
  return Uint8List.fromList(encoded);
}

/// A visual hint for a remote responder before the full media transfer lands.
String thumbnailBase64For(Uint8List jpeg) {
  final img.Image? decoded = img.decodeImage(jpeg);
  if (decoded == null) {
    throw const FormatException('Processed image is unreadable');
  }
  final int longest = decoded.width > decoded.height
      ? decoded.width
      : decoded.height;
  final img.Image thumb = longest <= 128
      ? decoded
      : img.copyResize(
          decoded,
          width: decoded.width >= decoded.height ? 128 : null,
          height: decoded.height > decoded.width ? 128 : null,
        );
  List<int> encoded = img.encodeJpg(thumb, quality: 55);
  for (int quality = 50; encoded.length > 7900 && quality >= 20; quality -= 5) {
    encoded = img.encodeJpg(thumb, quality: quality);
  }
  return base64Encode(encoded);
}

/// Persists an already captured camera image as mesh-ready evidence.
Future<ProcessedPhoto> processCameraPhoto(
  File source,
  Directory destination,
) async {
  final Uint8List sourceBytes = await source.readAsBytes();
  final Uint8List finalBytes = downscaleJpeg(sourceBytes);
  final String digest = sha256.convert(finalBytes).toString();
  final File output = File(
    '${destination.path}${Platform.pathSeparator}$digest.jpg',
  );
  await output.writeAsBytes(finalBytes, flush: true);
  return ProcessedPhoto(
    file: output,
    sha256: digest,
    thumbnailBase64: thumbnailBase64For(finalBytes),
    sizeBytes: finalBytes.length,
  );
}
