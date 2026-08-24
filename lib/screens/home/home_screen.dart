import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/app_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _responderStatus = 'Available';
  Color _statusColor = AppColors.available;
  final String _areaState = 'Emergency';

  late DateTime _incidentStartTime;
  String _runningDuration = '00:00:00';
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _incidentStartTime = DateTime.now().subtract(
      const Duration(hours: 3, minutes: 15),
    );
    _startIncidentTimer();
  }

  void _startIncidentTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      final difference = DateTime.now().difference(_incidentStartTime);
      final hours = difference.inHours.toString().padLeft(2, '0');
      final minutes = (difference.inMinutes % 60).toString().padLeft(2, '0');
      final seconds = (difference.inSeconds % 60).toString().padLeft(2, '0');
      if (mounted) {
        setState(() {
          _runningDuration = '$hours:$minutes:$seconds';
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _showStatusPicker() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        final options = [
          {'label': 'Available', 'color': AppColors.available},
          {'label': 'En Route', 'color': AppColors.enRoute},
          {'label': 'Engaged', 'color': AppColors.engaged},
          {'label': 'Resting', 'color': AppColors.resting},
          {'label': 'Off Duty', 'color': AppColors.offDuty},
        ];

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Update Your Status',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const Divider(),
                ...options.map((opt) {
                  final label = opt['label'] as String;
                  final color = opt['color'] as Color;
                  return ListTile(
                    leading: CircleAvatar(radius: 8, backgroundColor: color),
                    title: Text(label),
                    trailing: _responderStatus == label
                        ? const Icon(Icons.check, color: Colors.blue)
                        : null,
                    onTap: () {
                      setState(() {
                        _responderStatus = label;
                        _statusColor = color;
                      });
                      Navigator.pop(ctx);
                    },
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Responder Dashboard'),
        centerTitle: false,
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.emergency.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.emergency),
            ),
            child: Text(
              _areaState.toUpperCase(),
              style: const TextStyle(
                color: AppColors.emergency,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    const Text(
                      'ACTIVE INCIDENT DURATION',
                      style: TextStyle(
                        color: Colors.grey,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _runningDuration,
                      style: const TextStyle(
                        fontSize: 36,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 2,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            InkWell(
              onTap: _showStatusPicker,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(color: _statusColor, width: 2),
                  borderRadius: BorderRadius.circular(12),
                  color: _statusColor.withOpacity(0.08),
                ),
                child: Row(
                  children: [
                    CircleAvatar(backgroundColor: _statusColor, radius: 10),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'My Current State',
                            style: TextStyle(color: Colors.grey, fontSize: 12),
                          ),
                          Text(
                            _responderStatus,
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: _statusColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_drop_down),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
