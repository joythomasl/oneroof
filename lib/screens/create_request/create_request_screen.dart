import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:path_provider/path_provider.dart';

import '../../mesh/device_identity.dart';
import '../../mesh/media_store.dart';
import '../../mesh/mesh_message.dart';
import '../../mesh/report_store.dart';
import '../../theme/app_theme.dart';
import 'report_capture.dart';

class CreateRequestResult {
  const CreateRequestResult(this.reportId);
  final String reportId;
}

class _IncidentKind {
  const _IncidentKind(this.value, this.label, this.icon);
  final String value;
  final String label;
  final IconData icon;
}

const List<_IncidentKind> _kinds = <_IncidentKind>[
  _IncidentKind('collapse', 'Collapse', Icons.domain_outlined),
  _IncidentKind('trapped', 'Trapped', Icons.person_pin_circle_outlined),
  _IncidentKind('flooding', 'Flooding', Icons.water_outlined),
  _IncidentKind('fire', 'Fire', Icons.local_fire_department_outlined),
  _IncidentKind('road_blocked', 'Road blocked', Icons.block_outlined),
  _IncidentKind('medical', 'Medical', Icons.medical_services_outlined),
  _IncidentKind(
    'body_recovered',
    'Body recovered',
    Icons.personal_injury_outlined,
  ),
  _IncidentKind('landslide', 'Landslide', Icons.landscape_outlined),
  _IncidentKind('power_line', 'Power line', Icons.electric_bolt_outlined),
  _IncidentKind('gas_leak', 'Gas leak', Icons.propane_tank_outlined),
  _IncidentKind(
    'water_food',
    'Water / food',
    Icons.volunteer_activism_outlined,
  ),
  _IncidentKind('other', 'Other', Icons.more_horiz),
];

class _Severity {
  const _Severity(this.code, this.name, this.description);
  final String code;
  final String name;
  final String description;
}

const List<_Severity> _severities = <_Severity>[
  _Severity(
    'P0',
    'Life at immediate risk',
    'Trapped, drowning, fire with occupants',
  ),
  _Severity('P1', 'Serious, not immediate', 'Injured stable, isolated group'),
  _Severity(
    'P2',
    'Infrastructure / access',
    'Road blocked, line down, bridge damaged',
  ),
  _Severity(
    'P3',
    'Logistics / welfare',
    'Supply need, sanitation, damage survey',
  ),
];

/// Incident capture entry point. The area state is intentionally local until
/// the active incident/session API owns it.
class CreateRequestScreen extends StatefulWidget {
  const CreateRequestScreen({super.key, this.areaState = 'EMERGENCY'});
  final String areaState;

  @override
  State<CreateRequestScreen> createState() => _CreateRequestScreenState();
}

class _CreateRequestScreenState extends State<CreateRequestScreen> {
  final TextEditingController _description = TextEditingController();
  String? _kind;
  String? _severity;
  String _language = 'English';
  Position? _position;
  String? _locationError;
  bool _locating = true;
  bool _proceedWithoutGps = false;
  bool _capturing = false;
  ProcessedPhoto? _photo;

  bool get _canSubmit =>
      _kind != null &&
      _severity != null &&
      (!_locating && (_position != null || _proceedWithoutGps));

  @override
  void initState() {
    super.initState();
    _acquireLocation();
  }

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  Future<void> _acquireLocation() async {
    setState(() {
      _locating = true;
      _locationError = null;
      _proceedWithoutGps = false;
    });
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw const _LocationProblem('Location services are turned off');
      }
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw const _LocationProblem('Location permission was denied');
      }
      final Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      if (mounted) {
        setState(() => _position = position);
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => _locationError = error.toString().replaceFirst(
            '_LocationProblem: ',
            '',
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _locating = false);
      }
    }
  }

  Future<void> _takePhoto() async {
    setState(() => _capturing = true);
    try {
      // Evidence is camera-only by design: gallery files cannot establish
      // capture-time provenance, so do not add a gallery fallback here.
      final XFile? captured = await Navigator.of(context).push<XFile>(
        MaterialPageRoute<XFile>(builder: (_) => const _CameraCaptureScreen()),
      );
      if (captured == null || !mounted) return;
      final Directory root = await getApplicationDocumentsDirectory();
      final Directory evidence = Directory(
        '${root.path}${Platform.pathSeparator}incident-evidence',
      );
      if (!await evidence.exists()) await evidence.create(recursive: true);
      final ProcessedPhoto photo = await processCameraPhoto(
        File(captured.path),
        evidence,
      );
      MediaStore.instance.put(photo.sha256, photo.file);
      if (mounted) setState(() => _photo = photo);
    } on FileSystemException catch (_) {
      _notice(
        'Could not save photo — device storage may be full. You can still submit without it.',
      );
    } catch (error) {
      _notice('Camera unavailable: $error');
    } finally {
      if (mounted) setState(() => _capturing = false);
    }
  }

  void _notice(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(text)));
  }

  void _submit() {
    if (!_canSubmit) return;
    final DateTime capturedAt = DateTime.now().toUtc();
    final ProcessedPhoto? photo = _photo;
    final MeshMessage report = MeshMessage.create(
      type: MeshMessageType.incidentReport.wireName,
      originDevice: DeviceIdentity.deviceId,
      originUser: DeviceIdentity.userId,
      priority: severityToMeshPriority(_severity!),
      payload: <String, dynamic>{
        'incidentType': _kind,
        'severity': _severity,
        'description': _description.text.trim(),
        'language': _language,
        'lat': _position?.latitude,
        'lng': _position?.longitude,
        'gpsAccuracy': _position?.accuracy,
        'capturedAt': capturedAt.toIso8601String(),
        'photoSha256': photo?.sha256,
        'photoFilename': photo?.file.uri.pathSegments.last,
        'photoSizeBytes': photo?.sizeBytes,
        'thumbnailBase64': photo?.thumbnailBase64,
      },
    );
    reportStore.add(report);
    Navigator.of(context).pop(CreateRequestResult(report.id));
  }

  @override
  Widget build(BuildContext context) {
    final bool alert = widget.areaState.toUpperCase() == 'ALERT';
    return Scaffold(
      appBar: AppBar(
        title: Text(alert ? 'Emergency Activation Request' : 'Incident Report'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: <Widget>[
            _section('TYPE'),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _kinds.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                childAspectRatio: .93,
              ),
              itemBuilder: (_, int index) {
                final _IncidentKind item = _kinds[index];
                final bool selected = item.value == _kind;
                return Semantics(
                  selected: selected,
                  button: true,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => setState(() => _kind = item.value),
                    child: Ink(
                      decoration: BoxDecoration(
                        color: selected
                            ? AppColors.accent.withValues(alpha: .16)
                            : AppColors.surface,
                        border: Border.all(
                          color: selected ? AppColors.accent : AppColors.border,
                          width: selected ? 3 : 1,
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: <Widget>[
                          Icon(
                            item.icon,
                            color: selected
                                ? AppColors.accent
                                : AppColors.textPrimary,
                            size: 30,
                          ),
                          const SizedBox(height: 7),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: Text(
                              item.label,
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 24),
            _section('SEVERITY'),
            ..._severities.map(
              (_Severity item) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _SeverityRow(
                  item: item,
                  selected: _severity == item.code,
                  onTap: () => setState(() => _severity = item.code),
                ),
              ),
            ),
            const SizedBox(height: 16),
            _section('PHOTO'),
            if (_photo == null)
              OutlinedButton.icon(
                onPressed: _capturing ? null : _takePhoto,
                icon: _capturing
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.camera_alt_outlined),
                label: Text(_capturing ? 'Opening camera…' : 'Take photo'),
              )
            else
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: <Widget>[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.file(
                          _photo!.file,
                          height: 78,
                          width: 78,
                          fit: BoxFit.cover,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          '${(_photo!.sizeBytes / 1024).toStringAsFixed(0)} KB evidence ready',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                      TextButton(
                        onPressed: _takePhoto,
                        child: const Text('Retake'),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 24),
            _section('DESCRIPTION'),
            DropdownButtonFormField<String>(
              initialValue: _language,
              items:
                  const <String>[
                        'English',
                        'Malayalam',
                        'Tamil',
                        'Hindi',
                        'Kannada',
                      ]
                      .map(
                        (String e) =>
                            DropdownMenuItem<String>(value: e, child: Text(e)),
                      )
                      .toList(),
              onChanged: (String? value) => setState(() => _language = value!),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _description,
              maxLines: 4,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(
                hintText: 'What happened? (optional)',
              ),
            ),
            const SizedBox(height: 24),
            _section('AUTO-ATTACHED METADATA'),
            _metadataCard(),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              key: const ValueKey<String>('submit-report'),
              onPressed: _canSubmit ? _submit : null,
              icon: const Icon(Icons.send_outlined),
              label: Text(
                _locating ? 'Waiting for GPS…' : 'Queue incident report',
              ),
            ),
            if (_kind == null || _severity == null)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text(
                  'Choose a type and severity to continue.',
                  textAlign: TextAlign.center,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _section(String label) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text(
      label,
      style: Theme.of(context).textTheme.bodySmall
          ?.copyWith(letterSpacing: 1.2),
    ),
  );

  Widget _metadataCard() => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          _meta(
            'GPS',
            _locating
                ? 'acquiring…'
                : _position == null
                ? (_locationError ?? 'Not available')
                : '${_position!.latitude.toStringAsFixed(6)}, ${_position!.longitude.toStringAsFixed(6)}',
          ),
          _meta(
            'Accuracy',
            _position == null
                ? '—'
                : '±${_position!.accuracy.toStringAsFixed(0)} m',
          ),
          _meta(
            'Timestamp',
            DateTime.now().toLocal().toString().substring(0, 19),
          ),
          _meta('Responder', DeviceIdentity.userId),
          _meta('Agency', 'Samanvay Response'),
          _meta('Device', DeviceIdentity.shortDeviceId),
          if (!_locating && _position == null) ...<Widget>[
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => setState(() => _proceedWithoutGps = true),
              child: const Text('Submit without GPS'),
            ),
            TextButton(
              onPressed: _acquireLocation,
              child: const Text('Try GPS again'),
            ),
          ],
        ],
      ),
    ),
  );

  Widget _meta(String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 7),
    child: Row(
      children: <Widget>[
        SizedBox(
          width: 88,
          child: Text(label, style: Theme.of(context).textTheme.bodySmall),
        ),
        Expanded(child: Text(value)),
      ],
    ),
  );
}

class _SeverityRow extends StatelessWidget {
  const _SeverityRow({
    required this.item,
    required this.selected,
    required this.onTap,
  });
  final _Severity item;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    final Color color = AppColors.severity(item.code);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Ink(
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: .14) : AppColors.surface,
          border: Border.all(
            color: selected ? color : AppColors.border,
            width: selected ? 3 : 1,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: <Widget>[
              StatusBadge.severity(item.code),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      item.name,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      item.description,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              if (selected) Icon(Icons.check_circle, color: color),
            ],
          ),
        ),
      ),
    );
  }
}

class _CameraCaptureScreen extends StatefulWidget {
  const _CameraCaptureScreen();
  @override
  State<_CameraCaptureScreen> createState() => _CameraCaptureScreenState();
}

class _CameraCaptureScreenState extends State<_CameraCaptureScreen> {
  CameraController? _controller;
  String? _error;
  @override
  void initState() {
    super.initState();
    _open();
  }

  Future<void> _open() async {
    try {
      final List<CameraDescription> cameras = await availableCameras();
      if (cameras.isEmpty) throw StateError('No camera found');
      final CameraController controller = CameraController(
        cameras.first,
        ResolutionPreset.medium,
        enableAudio: false,
      );
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() => _controller = controller);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Capture incident evidence')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'Camera permission or hardware is unavailable.\n$_error',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }
    if (_controller == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Capture incident evidence')),
      body: Column(
        children: <Widget>[
          Expanded(child: CameraPreview(_controller!)),
          Padding(
            padding: const EdgeInsets.all(20),
            child: ElevatedButton.icon(
              onPressed: () async {
                final XFile file = await _controller!.takePicture();
                if (!context.mounted) return;
                Navigator.of(context).pop(file);
              },
              icon: const Icon(Icons.camera),
              label: const Text('Capture photo'),
            ),
          ),
        ],
      ),
    );
  }
}

class _LocationProblem implements Exception {
  const _LocationProblem(this.message);
  final String message;
  @override
  String toString() => '_LocationProblem: $message';
}
