import '../model/report_model.dart';

class DisasterService {
  static Future<List<ReportModel>> fetchReports() async {
    await Future.delayed(const Duration(milliseconds: 800));

    return [
      ReportModel(
        id: 'INC-4091',
        title: 'Flash Flood Inundation - Bridge St.',
        description:
            'Water levels surged 1.5m above normal. 3 civilian vehicles immobilized. Evacuation boat dispatched.',
        status: 'In Progress',
        severity: 'Emergency',
        timestamp: DateTime.now().subtract(const Duration(minutes: 25)),
      ),
      ReportModel(
        id: 'INC-4088',
        title: 'Structural Collapse Warning - Sector 9',
        description:
            'Multi-story commercial building shows foundational fissures following tremors. Perimeter cordoned.',
        status: 'Assigned',
        severity: 'Alert',
        timestamp: DateTime.now().subtract(
          const Duration(hours: 1, minutes: 10),
        ),
      ),
      ReportModel(
        id: 'INC-4075',
        title: 'Emergency Medical Oxygen Delivery',
        description:
            'Field clinic backup generator failing. Urgent oxygen cylinder restock required for 12 patients.',
        status: 'Pending Verification',
        severity: 'Emergency',
        timestamp: DateTime.now().subtract(const Duration(hours: 3)),
      ),
      ReportModel(
        id: 'INC-4050',
        title: 'Downed Power Lines & Gas Leak',
        description:
            'High voltage lines grounded across main highway. Local utility alerted and valve shutoff completed.',
        status: 'Closed',
        severity: 'Recovery',
        timestamp: DateTime.now().subtract(const Duration(hours: 6)),
      ),
    ];
  }
}
