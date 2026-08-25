import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../main.dart';
import '../../theme/app_theme.dart';

/// Two-step sign-in: phone number, then a 6-digit OTP.
///
/// The OTP is mocked — any 6 digits are accepted. Not yet reachable from
/// [SamanvayApp]; wire it up as the `home:` route once auth is live.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

enum _Step { phone, code }

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _phone = TextEditingController();
  final TextEditingController _code = TextEditingController();

  _Step _step = _Step.phone;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _phone.dispose();
    _code.dispose();
    super.dispose();
  }

  bool get _phoneValid => _phone.text.trim().length == 10;
  bool get _codeValid => _code.text.trim().length == 6;

  Future<void> _requestCode() async {
    if (!_phoneValid || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });

    // TODO(backend): call the OTP-request endpoint here and surface real
    // failures (unknown number, rate limited, responder deactivated).
    await Future<void>.delayed(const Duration(milliseconds: 600));

    if (!mounted) return;
    setState(() {
      _busy = false;
      _step = _Step.code;
    });
  }

  Future<void> _verifyCode() async {
    if (!_codeValid || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });

    // TODO(backend): verify the OTP against the auth endpoint, store the
    // returned session token, and only then navigate.
    await Future<void>.delayed(const Duration(milliseconds: 600));

    if (!mounted) return;
    setState(() => _busy = false);
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(builder: (_) => const RootNav()),
    );
  }

  void _editNumber() {
    setState(() {
      _step = _Step.phone;
      _code.clear();
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              const SizedBox(height: 32),
              const Icon(Icons.shield_outlined,
                  size: 56, color: AppColors.info),
              const SizedBox(height: 20),
              Text('Samanvay Responder',
                  textAlign: TextAlign.center, style: text.headlineSmall),
              const SizedBox(height: 8),
              Text(
                'Multi-agency disaster response',
                textAlign: TextAlign.center,
                style: text.bodySmall,
              ),
              const SizedBox(height: 40),
              if (_step == _Step.phone) ..._phoneStep(text) else ..._codeStep(text),
              if (_error != null) ...<Widget>[
                const SizedBox(height: 16),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: text.bodyMedium?.copyWith(color: AppColors.p0),
                ),
              ],
              const Spacer(),
              Text(
                'Registered responders only. Access is logged.',
                textAlign: TextAlign.center,
                style: text.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _phoneStep(TextTheme text) {
    return <Widget>[
      Text('Mobile number', style: text.titleMedium),
      const SizedBox(height: 12),
      TextField(
        controller: _phone,
        keyboardType: TextInputType.phone,
        autofocus: true,
        maxLength: 10,
        style: const TextStyle(fontSize: 22, letterSpacing: 2),
        inputFormatters: <TextInputFormatter>[
          FilteringTextInputFormatter.digitsOnly,
        ],
        decoration: const InputDecoration(
          prefixText: '+91  ',
          prefixStyle: TextStyle(
            fontSize: 22,
            color: AppColors.textSecondary,
          ),
          hintText: '9876543210',
          counterText: '',
        ),
        onChanged: (_) => setState(() {}),
        onSubmitted: (_) => _requestCode(),
      ),
      const SizedBox(height: 24),
      ElevatedButton(
        onPressed: _phoneValid && !_busy ? _requestCode : null,
        child: _busy
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                    strokeWidth: 2.5, color: Colors.white),
              )
            : const Text('Send code'),
      ),
    ];
  }

  List<Widget> _codeStep(TextTheme text) {
    return <Widget>[
      Text('Enter the 6-digit code', style: text.titleMedium),
      const SizedBox(height: 6),
      Row(
        children: <Widget>[
          Text('Sent to +91 ${_phone.text}', style: text.bodySmall),
          const Spacer(),
          TextButton(onPressed: _busy ? null : _editNumber, child: const Text('Change')),
        ],
      ),
      const SizedBox(height: 12),
      TextField(
        controller: _code,
        keyboardType: TextInputType.number,
        autofocus: true,
        maxLength: 6,
        textAlign: TextAlign.center,
        style: const TextStyle(
          fontSize: 30,
          fontWeight: FontWeight.w700,
          letterSpacing: 12,
        ),
        inputFormatters: <TextInputFormatter>[
          FilteringTextInputFormatter.digitsOnly,
        ],
        decoration: const InputDecoration(hintText: '••••••', counterText: ''),
        onChanged: (_) => setState(() {}),
        onSubmitted: (_) => _verifyCode(),
      ),
      const SizedBox(height: 24),
      ElevatedButton(
        onPressed: _codeValid && !_busy ? _verifyCode : null,
        child: _busy
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                    strokeWidth: 2.5, color: Colors.white),
              )
            : const Text('Verify and sign in'),
      ),
      const SizedBox(height: 8),
      TextButton(
        // TODO(backend): re-request the OTP, with a resend cooldown.
        onPressed: _busy ? null : () {},
        child: const Text('Resend code'),
      ),
      const SizedBox(height: 8),
      Text(
        'Mock verification: any 6 digits are accepted.',
        textAlign: TextAlign.center,
        style: text.bodySmall,
      ),
    ];
  }
}
