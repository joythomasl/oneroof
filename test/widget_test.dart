// Smoke tests for the responder app shell.
//
// These only cover what can run without the platform channels that
// flutter_p2p_connection needs, so the Mesh tab is exercised as a widget but
// never driven into a real P2P session here.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:oneroof/main.dart';
import 'package:oneroof/theme/app_theme.dart';

void main() {
  testWidgets('root shell shows all four tabs', (WidgetTester tester) async {
    await tester.pumpWidget(const SamanvayApp());

    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Mesh'), findsWidgets);
    expect(find.text('Reports'), findsWidgets);
    expect(find.text('Profile'), findsWidgets);

    // Unmount so HomeScreen's periodic timer is cancelled before teardown.
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('home shows area state and cycles duty status',
      (WidgetTester tester) async {
    await tester.pumpWidget(const SamanvayApp());

    expect(find.widgetWithText(StatusBadge, 'EMERGENCY'), findsOneWidget);
    expect(find.text('Available'), findsOneWidget);

    await tester.tap(find.text('Change to En Route'));
    await tester.pump();

    expect(find.text('En Route'), findsOneWidget);

    await tester.pumpWidget(const SizedBox.shrink());
  });
}
