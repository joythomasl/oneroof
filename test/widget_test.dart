// Smoke tests for the responder app shell.
//
// These only cover what can run without the platform channels that
// flutter_p2p_connection needs, so the Mesh tab is exercised as a widget but
// never driven into a real P2P session here.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_p2p_connection/flutter_p2p_connection.dart';
import 'package:oneroof/main.dart';
import 'package:oneroof/mesh/bridge_mode.dart';
import 'package:oneroof/mesh/connection_manager.dart';
import 'package:oneroof/mesh/message_store.dart';
import 'package:oneroof/mesh/sync_protocol.dart';
import 'package:oneroof/screens/mesh/bridge_screen.dart';
import 'package:oneroof/screens/mesh/cycle_test_screen.dart';
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

  testWidgets('mesh screen lays out on a POCO M6 5G without overflow',
      (WidgetTester tester) async {
    // 1080x2400 at 2.75x — the target device. The Store/Sync log section
    // headers each carry two buttons, so they are the tightest rows in the
    // app; this catches a regression there before it reaches a phone.
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.75;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const SamanvayApp());
    await tester.tap(find.byIcon(Icons.hub_outlined));
    await tester.pump();

    expect(find.text('Diagnose'), findsOneWidget);
    expect(find.text('Sync now'), findsOneWidget);
    expect(find.text('STORE (0)'), findsOneWidget);
    expect(find.text('SYNC LOG'), findsOneWidget);
    // A RenderFlex overflow would surface here.
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('cycle test screen lays out on a POCO M6 5G without overflow',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.75;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    // Inert: the manager only touches a platform channel once an operation
    // starts, and this test never presses Start.
    await tester.pumpWidget(MaterialApp(
      theme: AppTheme.dark,
      home: CycleTestScreen(
        connection: ConnectionManager(
          username: 'test',
          clientFactory: FlutterP2pClient.new,
        ),
        store: MessageStore(),
        protocol: const SyncProtocol(),
      ),
    ));
    await tester.pump();

    expect(find.text('Start'), findsOneWidget);
    expect(find.text('Cycles'), findsOneWidget);
    expect(find.text('CONNECT'), findsOneWidget); // table header
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('bridge screen lays out on a POCO M6 5G without overflow',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.75;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final ConnectionManager connection = ConnectionManager(
      username: 'test',
      clientFactory: FlutterP2pClient.new,
    );
    addTearDown(connection.dispose);

    await tester.pumpWidget(MaterialApp(
      theme: AppTheme.dark,
      home: BridgeScreen(
        bridge: BridgeMode(
          connection: connection,
          store: MessageStore(),
          protocol: const SyncProtocol(),
        ),
        connection: connection,
        discovered: const <BleDiscoveredDevice>[
          BleDiscoveredDevice(deviceAddress: 'AA', deviceName: 'KRP-FIRE-04'),
          BleDiscoveredDevice(deviceAddress: 'BB', deviceName: 'KRP-MED-02'),
        ],
      ),
    ));
    await tester.pump();

    // Four number fields in one row is the tightest layout in the app.
    expect(find.text('Scan s'), findsOneWidget);
    expect(find.text('Settle s'), findsOneWidget);
    expect(find.text('RELAYS COMPLETED'), findsOneWidget);
    expect(find.text('— per hop'), findsOneWidget);
    expect(find.text('Start bridging'), findsOneWidget);
    expect(tester.takeException(), isNull);

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
