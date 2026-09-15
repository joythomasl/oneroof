import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:oneroof/screens/create_request/create_request_screen.dart';
import 'package:oneroof/screens/create_request/report_capture.dart';
import 'package:oneroof/theme/app_theme.dart';

void main() {
  test('severity maps to the incident mesh priorities', () {
    expect(severityToMeshPriority('P0'), 0);
    expect(severityToMeshPriority('P1'), 1);
    expect(severityToMeshPriority('P2'), 2);
    expect(severityToMeshPriority('P3'), 2);
  });

  test('downscaled evidence stays below the bridge transfer budget', () {
    final img.Image source = img.fill(
      img.Image(width: 2400, height: 1600),
      color: img.ColorRgb8(30, 110, 180),
    );
    final Uint8List output = downscaleJpeg(
      Uint8List.fromList(img.encodeJpg(source, quality: 100)),
    );
    final img.Image decoded = img.decodeJpg(output)!;
    expect(decoded.width, 1024);
    expect(output.length, lessThan(300 * 1024));
  });

  test('embedded thumbnail is below 8KB', () {
    final img.Image source = img.fill(
      img.Image(width: 1024, height: 768),
      color: img.ColorRgb8(230, 80, 30),
    );
    final String thumb = thumbnailBase64For(
      Uint8List.fromList(img.encodeJpg(source)),
    );
    expect(base64Decode(thumb).length, lessThan(8 * 1024));
  });

  testWidgets('submit is blocked without type and severity', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(theme: AppTheme.dark, home: const CreateRequestScreen()),
    );
    await tester.pump();
    // The button is below the type grid, so scroll the form rather than a
    // non-scrollable nested grid. It remains disabled without both choices.
    final Finder submit = find.byKey(const ValueKey<String>('submit-report'));
    await tester.scrollUntilVisible(
      submit,
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(submit, findsOneWidget);
    final ElevatedButton button = tester.widget<ElevatedButton>(submit);
    expect(button.onPressed, isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
