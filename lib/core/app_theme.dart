import 'package:flutter/material.dart';

class AppColors {
  // Area Severity Statuses
  static const Color alert = Color(0xFFFFC107);       // Yellow/Amber
  static const Color emergency = Color(0xFFE53935);   // Red
  static const Color recovery = Color(0xFF43A047);    // Green

  // Responder Statuses
  static const Color available = Color(0xFF4CAF50);   // Green
  static const Color enRoute = Color(0xFF1E88E5);     // Blue
  static const Color engaged = Color(0xFFFB8C00);     // Orange
  static const Color resting = Color(0xFF8E24AA);     // Purple
  static const Color offDuty = Color(0xFF757575);     // Grey

  // Report Statuses
  static const Color reported = Color(0xFF607D8B);
  static const Color assigned = Color(0xFF2196F3);
  static const Color inProgress = Color(0xFFFF9800);
  static const Color pendingVerification = Color(0xFFFFC107);
  static const Color closed = Color(0xFF4CAF50);
  static const Color reopened = Color(0xFFE91E63);
}