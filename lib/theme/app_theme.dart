import 'package:flutter/material.dart';

/// Colour tokens for the responder app.
///
/// The palette is deliberately high-contrast: this UI is read on a phone
/// screen, outdoors, by someone who is tired and in a hurry. Severity and
/// area-state colours are the only saturated colours in the app, so they
/// always read as signal rather than decoration.
class AppColors {
  const AppColors._();

  // --- Incident severity scale (P0 = most severe) ---
  static const Color p0 = Color(0xFFE53935); // red    - life safety, immediate
  static const Color p1 = Color(0xFFFB8C00); // orange - urgent
  static const Color p2 = Color(0xFFFDD835); // yellow - elevated
  static const Color p3 = Color(0xFF43A047); // green  - routine

  // --- Area state ---
  static const Color emergency = p0;
  static const Color alert = p1;
  static const Color normal = p3;

  // --- Dark "control room" surfaces ---
  static const Color background = Color(0xFF0E1116);
  static const Color surface = Color(0xFF161B22);
  static const Color surfaceVariant = Color(0xFF21262D);
  static const Color border = Color(0xFF30363D);

  // --- Text ---
  static const Color textPrimary = Color(0xFFE6EDF3);
  static const Color textSecondary = Color(0xFF8B949E);

  // --- Accent (interactive elements, links, focus) ---
  static const Color accent = Color(0xFF388BFD);
  static const Color info = Color(0xFF58A6FF);

  /// Colour for an incident severity code: `P0`..`P3` (case-insensitive).
  ///
  /// Unknown codes fall back to [textSecondary] so bad data reads as
  /// "unclassified" instead of silently rendering as routine.
  static Color severity(String code) {
    switch (code.trim().toUpperCase()) {
      case 'P0':
        return p0;
      case 'P1':
        return p1;
      case 'P2':
        return p2;
      case 'P3':
        return p3;
      default:
        return textSecondary;
    }
  }

  /// Colour for an area state label such as `EMERGENCY`, `ALERT`, `NORMAL`.
  static Color areaState(String state) {
    switch (state.trim().toUpperCase()) {
      case 'EMERGENCY':
        return emergency;
      case 'ALERT':
        return alert;
      case 'NORMAL':
        return normal;
      default:
        return textSecondary;
    }
  }

  /// Colour for a report workflow status.
  static Color reportStatus(String status) {
    switch (status.trim().toUpperCase()) {
      case 'PENDING VERIFICATION':
        return p1;
      case 'VERIFIED':
      case 'IN PROGRESS':
        return info;
      case 'CLOSED':
        return p3;
      case 'REOPENED':
        return p0;
      default:
        return textSecondary;
    }
  }
}

/// App-wide theming. Only [AppTheme.dark] exists by design — the app is used
/// at night, in the field, on low battery.
class AppTheme {
  const AppTheme._();

  /// Minimum height for primary interactive controls. Responders may be
  /// wearing gloves, so nothing tappable should be smaller than this.
  static const double minTouchTarget = 56.0;

  static ThemeData get dark {
    const ColorScheme scheme = ColorScheme.dark(
      primary: AppColors.accent,
      onPrimary: Colors.white,
      secondary: AppColors.info,
      onSecondary: Colors.black,
      surface: AppColors.surface,
      onSurface: AppColors.textPrimary,
      error: AppColors.p0,
      onError: Colors.white,
      outline: AppColors.border,
    );

    const TextTheme text = TextTheme(
      headlineSmall: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.w700,
        color: AppColors.textPrimary,
        letterSpacing: 0.2,
      ),
      titleLarge: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: AppColors.textPrimary,
      ),
      titleMedium: TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimary,
      ),
      bodyLarge: TextStyle(fontSize: 16, color: AppColors.textPrimary),
      bodyMedium: TextStyle(fontSize: 15, color: AppColors.textPrimary),
      bodySmall: TextStyle(fontSize: 13, color: AppColors.textSecondary),
      labelLarge: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.3,
      ),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: scheme,
      scaffoldBackgroundColor: AppColors.background,
      canvasColor: AppColors.background,
      dividerColor: AppColors.border,
      textTheme: text,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppColors.border),
        ),
      ),
      listTileTheme: const ListTileThemeData(
        iconColor: AppColors.textSecondary,
        textColor: AppColors.textPrimary,
        minVerticalPadding: 12,
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.border,
        space: 1,
        thickness: 1,
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.surface,
        selectedItemColor: AppColors.info,
        unselectedItemColor: AppColors.textSecondary,
        type: BottomNavigationBarType.fixed,
        selectedLabelStyle: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        unselectedLabelStyle: TextStyle(fontSize: 13),
        elevation: 0,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.accent,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.surfaceVariant,
          disabledForegroundColor: AppColors.textSecondary,
          minimumSize: const Size.fromHeight(minTouchTarget),
          textStyle: text.labelLarge,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.textPrimary,
          minimumSize: const Size.fromHeight(minTouchTarget),
          side: const BorderSide(color: AppColors.border),
          textStyle: text.labelLarge,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.info,
          minimumSize: const Size(64, 48),
          textStyle: text.labelLarge,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceVariant,
        hintStyle: const TextStyle(color: AppColors.textSecondary),
        labelStyle: const TextStyle(color: AppColors.textSecondary),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.accent, width: 2),
        ),
      ),
      snackBarTheme: const SnackBarThemeData(
        backgroundColor: AppColors.surfaceVariant,
        contentTextStyle: TextStyle(color: AppColors.textPrimary, fontSize: 15),
        behavior: SnackBarBehavior.floating,
      ),
      progressIndicatorTheme:
          const ProgressIndicatorThemeData(color: AppColors.info),
    );
  }
}

/// Pill-shaped status chip used for area state, incident severity and report
/// status. Tinted fill plus a full-strength border, so it stays legible on
/// every surface in the app.
class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.label,
    required this.color,
    this.icon,
    this.dense = false,
  });

  /// Badge for an incident severity code (`P0`..`P3`).
  StatusBadge.severity(String code, {super.key, this.icon, this.dense = false})
      : label = code.toUpperCase(),
        color = AppColors.severity(code);

  /// Badge for an area state (`EMERGENCY`, `ALERT`, `NORMAL`).
  StatusBadge.areaState(
    String state, {
    super.key,
    this.icon,
    this.dense = false,
  })  : label = state.toUpperCase(),
        color = AppColors.areaState(state);

  /// Badge for a report workflow status (`Pending Verification`, `Closed`, ...).
  StatusBadge.reportStatus(
    String status, {
    super.key,
    this.icon,
    this.dense = false,
  })  : label = status.toUpperCase(),
        color = AppColors.reportStatus(status);

  final String label;
  final Color color;
  final IconData? icon;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final double fontSize = dense ? 11 : 13;
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: dense ? 8 : 12,
        vertical: dense ? 3 : 6,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.16),
        border: Border.all(color: color, width: 1.5),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          if (icon != null) ...<Widget>[
            Icon(icon, size: fontSize + 3, color: color),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: fontSize,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
            ),
          ),
        ],
      ),
    );
  }
}
