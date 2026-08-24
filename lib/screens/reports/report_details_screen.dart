import 'package:flutter/material.dart';
import '../../model/report_model.dart';

class ReportDetailsScreen extends StatelessWidget {
  final ReportModel report;
  const ReportDetailsScreen({super.key, required this.report});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(report.id)),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Chip(
                  label: Text(report.status, style: const TextStyle(color: Colors.white)),
                  backgroundColor: report.statusColor,
                ),
                const SizedBox(width: 8),
                Chip(label: Text('Severity: ${report.severity}')),
              ],
            ),
            const SizedBox(height: 16),
            Text(report.title, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 12),
            Text(report.description, style: const TextStyle(fontSize: 16)),
          ],
        ),
      ),
    );
  }
}