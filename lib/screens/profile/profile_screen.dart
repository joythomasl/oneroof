import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  // TODO(backend): every field below comes from the responder record returned
  // at sign-in. Cache it locally — this screen must render with no network.
  static const String _name = 'S. Ramesh';
  static const String _agency = 'National Disaster Response Force';
  static const String _rank = 'Inspector · Team Delta';
  static const String _unitId = 'DELTA-12';
  static const String _phone = '+91 98••• ••210';

  static const List<String> _languages = <String>[
    'English',
    'हिन्दी',
    'മലയാളം',
    'தமிழ்',
  ];
  String _language = _languages.first;

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: <Widget>[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: <Widget>[
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceVariant,
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(32),
                    ),
                    child: const Icon(Icons.person,
                        size: 34, color: AppColors.textSecondary),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(_name, style: text.titleLarge),
                        const SizedBox(height: 4),
                        Text(_rank, style: text.bodySmall),
                        const SizedBox(height: 10),
                        StatusBadge(
                          label: _unitId,
                          color: AppColors.info,
                          icon: Icons.badge_outlined,
                          dense: true,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('DETAILS', style: text.bodySmall?.copyWith(letterSpacing: 1.2)),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: <Widget>[
                const _InfoRow(
                  icon: Icons.apartment_outlined,
                  label: 'Agency',
                  value: _agency,
                ),
                const Divider(),
                const _InfoRow(
                  icon: Icons.military_tech_outlined,
                  label: 'Rank',
                  value: _rank,
                ),
                const Divider(),
                const _InfoRow(
                  icon: Icons.phone_outlined,
                  label: 'Phone',
                  value: _phone,
                ),
                const Divider(),
                ListTile(
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  leading: const Icon(Icons.translate, size: 26),
                  title: Text('Language', style: text.bodySmall),
                  subtitle: Text(_language, style: text.bodyLarge),
                  trailing: DropdownButton<String>(
                    value: _language,
                    underline: const SizedBox.shrink(),
                    dropdownColor: AppColors.surfaceVariant,
                    // TODO(i18n): this only changes the label today. Wire it to
                    // a Localizations delegate and persist the choice.
                    onChanged: (String? value) {
                      if (value == null) return;
                      setState(() => _language = value);
                    },
                    items: _languages
                        .map((String l) => DropdownMenuItem<String>(
                              value: l,
                              child: Text(l, style: text.bodyLarge),
                            ))
                        .toList(),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            // TODO(backend): clear the session token and any cached responder
            // data, then send the user back to LoginScreen.
            onPressed: () {
              ScaffoldMessenger.of(context)
                ..hideCurrentSnackBar()
                ..showSnackBar(
                  const SnackBar(content: Text('Sign-out not wired yet')),
                );
            },
            icon: const Icon(Icons.logout, color: AppColors.p0),
            label: const Text('Sign out',
                style: TextStyle(color: AppColors.p0)),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final TextTheme text = Theme.of(context).textTheme;
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      leading: Icon(icon, size: 26),
      title: Text(label, style: text.bodySmall),
      subtitle: Text(value, style: text.bodyLarge),
    );
  }
}
