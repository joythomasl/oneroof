// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Malayalam (`ml`).
class AppLocalizationsMl extends AppLocalizations {
  AppLocalizationsMl([String locale = 'ml']) : super(locale);

  @override
  String get appTitle => 'Samanvay Responder';

  @override
  String get home => 'Home';

  @override
  String get mesh => 'Mesh';

  @override
  String get reports => 'Reports';

  @override
  String get profile => 'Profile';

  @override
  String get account => 'Account';

  @override
  String get elapsed => 'Elapsed';

  @override
  String get countdown => 'Countdown';

  @override
  String get sinceEmergencyDeclared => 'since emergency declared';

  @override
  String toRecoveryPhase(Object hours, Object minutes) {
    return '${hours}h ${minutes}m to recovery phase';
  }

  @override
  String get recoveryPhaseDue => 'Recovery phase due';

  @override
  String get yourStatus => 'Your status';

  @override
  String get tapToChange => 'Tap below to change';

  @override
  String get selectDutyStatus => 'Select duty status';

  @override
  String get available => 'Available';

  @override
  String get enRoute => 'En route';

  @override
  String get engaged => 'Engaged';

  @override
  String get resting => 'Resting';

  @override
  String get offDuty => 'Off duty';

  @override
  String get readyForTasking => 'Ready for tasking';

  @override
  String get travellingToIncident => 'Travelling to an assigned incident';

  @override
  String get activelyWorking => 'Actively working an incident';

  @override
  String get mandatoryRest => 'Mandatory rest, not available';

  @override
  String get shiftEnded => 'Shift ended';

  @override
  String get linkedIncident => 'Linked incident ID';

  @override
  String get restDuration => 'Rest duration (minutes)';

  @override
  String get continueLabel => 'Continue';

  @override
  String get cancel => 'Cancel';

  @override
  String statusSetTo(Object status) {
    return 'Status set to $status';
  }

  @override
  String statusQueued(Object status) {
    return '$status status queued for mesh sync';
  }

  @override
  String statusSentNow(Object status) {
    return '$status status sent over mesh';
  }

  @override
  String get changeStatus => 'Change status';

  @override
  String get quickActions => 'Quick actions';

  @override
  String get fileNewReport => 'File new report';

  @override
  String get casualtyHazardResource => 'Casualty, hazard, resource request';

  @override
  String get quickReportP0 => 'Quick report — P0';

  @override
  String get trapped => 'Trapped';

  @override
  String get fire => 'Fire';

  @override
  String get flood => 'Flood';

  @override
  String get medical => 'Medical';

  @override
  String reportQueuedForSync(Object label, Object id) {
    return '$label P0 #$id queued for mesh sync';
  }

  @override
  String reportQueuedGeneric(Object id) {
    return 'Report #$id queued for next mesh sync';
  }

  @override
  String get openProfileTab => 'Open the Profile tab';

  @override
  String get reportDetail => 'Report detail';

  @override
  String timeFiled(Object time) {
    return 'Filed $time';
  }

  @override
  String get type => 'Type';

  @override
  String get photo => 'Photo';

  @override
  String fullImageSyncing(Object progress) {
    return 'Full image syncing… $progress%';
  }

  @override
  String get evidenceChain => 'Evidence chain';

  @override
  String get captured => 'Captured';

  @override
  String get location => 'Location';

  @override
  String get accuracy => 'Accuracy';

  @override
  String get distanceFromYou => 'Distance from you';

  @override
  String get description => 'Description';

  @override
  String get language => 'Language';

  @override
  String get timeline => 'Timeline';

  @override
  String syncedLateMinutes(Object minutes) {
    return 'synced ${minutes}m after event';
  }

  @override
  String get syncState => 'Sync state';

  @override
  String queuedForSync(Object position) {
    return 'Queued for server sync · priority position $position';
  }

  @override
  String get reachedServer => 'Reached server';

  @override
  String get rejectionReason => 'CPOC rejection — action required';

  @override
  String get reAttend => 'Re-attend and re-shoot';

  @override
  String rejectedBy(Object actor, Object time) {
    return 'Rejected by $actor · $time';
  }

  @override
  String reportsCount(Object count, Object sector) {
    return '$count reports — $sector';
  }

  @override
  String get newReport => 'New report';

  @override
  String get filtersNotWired => 'Filters not wired yet';

  @override
  String get reportComposerNotBuilt => 'Report composer not built yet';

  @override
  String get filter => 'Filter';

  @override
  String get identity => 'Identity';

  @override
  String get capabilities => 'Capabilities';

  @override
  String get device => 'Device';

  @override
  String get shift => 'Shift';

  @override
  String get session => 'Session';

  @override
  String get boundDevice => 'Bound device';

  @override
  String get meshNode => 'Mesh node';

  @override
  String get oneDeviceNote =>
      'One active device per responder is enforced. Re-binding requires CPOC approval.';

  @override
  String get hoursOnTask => 'Hours on task';

  @override
  String get lastCheckIn => 'Last check-in';

  @override
  String get nextCheckIn => 'Next check-in due';

  @override
  String offlineCredentials(Object hours, Object minutes) {
    return 'Offline credentials valid for ${hours}h ${minutes}m';
  }

  @override
  String get logOut => 'Log out';

  @override
  String get logOutConfirm => 'Are you sure you want to log out?';

  @override
  String get name => 'Name';

  @override
  String get rank => 'Rank';

  @override
  String get agency => 'Agency';

  @override
  String get callsign => 'Callsign';

  @override
  String get serviceNumber => 'Service number';

  @override
  String get assignedArea => 'Assigned area';

  @override
  String get selectIncidentType => 'Select incident type';

  @override
  String get selectSeverity => 'Select severity';

  @override
  String get incidentType => 'Incident type';

  @override
  String get severity => 'Severity';

  @override
  String get descriptionHint => 'Describe what you see';

  @override
  String get capturePhoto => 'Capture photo';

  @override
  String get retakePhoto => 'Retake photo';

  @override
  String get acquiringLocation => 'Acquiring location…';

  @override
  String get locationAcquired => 'Location acquired';

  @override
  String get locationFailed => 'Location unavailable';

  @override
  String get proceedWithoutGps => 'Proceed without GPS';

  @override
  String get retryLocation => 'Retry location';

  @override
  String get submitReport => 'Submit report';

  @override
  String get photoOptional => 'Photo (optional)';

  @override
  String get collapse => 'Collapse';

  @override
  String get roadBlocked => 'Road blocked';

  @override
  String get bodyRecovered => 'Body recovered';

  @override
  String get landslide => 'Landslide';

  @override
  String get powerLine => 'Power line';

  @override
  String get gasLeak => 'Gas leak';

  @override
  String get waterFood => 'Water / food';

  @override
  String get other => 'Other';

  @override
  String get flooding => 'Flooding';

  @override
  String get lifeAtImmediateRisk => 'Life at immediate risk';

  @override
  String get trappedDrowningFire => 'Trapped, drowning, fire with occupants';

  @override
  String get seriousNotImmediate => 'Serious, not immediate';

  @override
  String get injuredStableIsolated => 'Injured stable, isolated group';

  @override
  String get infrastructureAccess => 'Infrastructure / access';

  @override
  String get roadBlockedLineBridge => 'Road blocked, line down, bridge damaged';

  @override
  String get logisticsWelfare => 'Logistics / welfare';

  @override
  String get supplyNeedSanitation => 'Supply need, sanitation, damage survey';

  @override
  String get diagnose => 'Diagnose';

  @override
  String get syncNow => 'Sync now';
}
