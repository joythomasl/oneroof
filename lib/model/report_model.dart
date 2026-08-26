import 'package:flutter/material.dart';
import '../core/app_theme.dart';

class ReportModel {
  final String id;
  final String title;
  final String description;
  final String status;
  final String severity;
  final DateTime timestamp;

  ReportModel({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.severity,
    required this.timestamp,
  });

  Color get statusColor {
    switch (status) {
      case 'Reported': return AppColors.reported;
      case 'Assigned': return AppColors.assigned;
      case 'In Progress': return AppColors.inProgress;
      case 'Pending Verification': return AppColors.pendingVerification;
      case 'Closed': return AppColors.recovery;
      case 'Reopened': return AppColors.reopened;
      default: return Colors.grey;
    }
  }
}