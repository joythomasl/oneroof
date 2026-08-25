import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_hi.dart';
import 'app_localizations_kn.dart';
import 'app_localizations_ml.dart';
import 'app_localizations_ta.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('hi'),
    Locale('kn'),
    Locale('ml'),
    Locale('ta'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Samanvay Responder'**
  String get appTitle;

  /// No description provided for @home.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get home;

  /// No description provided for @mesh.
  ///
  /// In en, this message translates to:
  /// **'Mesh'**
  String get mesh;

  /// No description provided for @reports.
  ///
  /// In en, this message translates to:
  /// **'Reports'**
  String get reports;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @account.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get account;

  /// No description provided for @elapsed.
  ///
  /// In en, this message translates to:
  /// **'Elapsed'**
  String get elapsed;

  /// No description provided for @countdown.
  ///
  /// In en, this message translates to:
  /// **'Countdown'**
  String get countdown;

  /// No description provided for @sinceEmergencyDeclared.
  ///
  /// In en, this message translates to:
  /// **'since emergency declared'**
  String get sinceEmergencyDeclared;

  /// No description provided for @toRecoveryPhase.
  ///
  /// In en, this message translates to:
  /// **'{hours}h {minutes}m to recovery phase'**
  String toRecoveryPhase(Object hours, Object minutes);

  /// No description provided for @recoveryPhaseDue.
  ///
  /// In en, this message translates to:
  /// **'Recovery phase due'**
  String get recoveryPhaseDue;

  /// No description provided for @yourStatus.
  ///
  /// In en, this message translates to:
  /// **'Your status'**
  String get yourStatus;

  /// No description provided for @tapToChange.
  ///
  /// In en, this message translates to:
  /// **'Tap below to change'**
  String get tapToChange;

  /// No description provided for @selectDutyStatus.
  ///
  /// In en, this message translates to:
  /// **'Select duty status'**
  String get selectDutyStatus;

  /// No description provided for @available.
  ///
  /// In en, this message translates to:
  /// **'Available'**
  String get available;

  /// No description provided for @enRoute.
  ///
  /// In en, this message translates to:
  /// **'En route'**
  String get enRoute;

  /// No description provided for @engaged.
  ///
  /// In en, this message translates to:
  /// **'Engaged'**
  String get engaged;

  /// No description provided for @resting.
  ///
  /// In en, this message translates to:
  /// **'Resting'**
  String get resting;

  /// No description provided for @offDuty.
  ///
  /// In en, this message translates to:
  /// **'Off duty'**
  String get offDuty;

  /// No description provided for @readyForTasking.
  ///
  /// In en, this message translates to:
  /// **'Ready for tasking'**
  String get readyForTasking;

  /// No description provided for @travellingToIncident.
  ///
  /// In en, this message translates to:
  /// **'Travelling to an assigned incident'**
  String get travellingToIncident;

  /// No description provided for @activelyWorking.
  ///
  /// In en, this message translates to:
  /// **'Actively working an incident'**
  String get activelyWorking;

  /// No description provided for @mandatoryRest.
  ///
  /// In en, this message translates to:
  /// **'Mandatory rest, not available'**
  String get mandatoryRest;

  /// No description provided for @shiftEnded.
  ///
  /// In en, this message translates to:
  /// **'Shift ended'**
  String get shiftEnded;

  /// No description provided for @linkedIncident.
  ///
  /// In en, this message translates to:
  /// **'Linked incident ID'**
  String get linkedIncident;

  /// No description provided for @restDuration.
  ///
  /// In en, this message translates to:
  /// **'Rest duration (minutes)'**
  String get restDuration;

  /// No description provided for @continueLabel.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get continueLabel;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @statusSetTo.
  ///
  /// In en, this message translates to:
  /// **'Status set to {status}'**
  String statusSetTo(Object status);

  /// No description provided for @statusQueued.
  ///
  /// In en, this message translates to:
  /// **'{status} status queued for mesh sync'**
  String statusQueued(Object status);

  /// No description provided for @statusSentNow.
  ///
  /// In en, this message translates to:
  /// **'{status} status sent over mesh'**
  String statusSentNow(Object status);

  /// No description provided for @changeStatus.
  ///
  /// In en, this message translates to:
  /// **'Change status'**
  String get changeStatus;

  /// No description provided for @quickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick actions'**
  String get quickActions;

  /// No description provided for @fileNewReport.
  ///
  /// In en, this message translates to:
  /// **'File new report'**
  String get fileNewReport;

  /// No description provided for @casualtyHazardResource.
  ///
  /// In en, this message translates to:
  /// **'Casualty, hazard, resource request'**
  String get casualtyHazardResource;

  /// No description provided for @quickReportP0.
  ///
  /// In en, this message translates to:
  /// **'Quick report — P0'**
  String get quickReportP0;

  /// No description provided for @trapped.
  ///
  /// In en, this message translates to:
  /// **'Trapped'**
  String get trapped;

  /// No description provided for @fire.
  ///
  /// In en, this message translates to:
  /// **'Fire'**
  String get fire;

  /// No description provided for @flood.
  ///
  /// In en, this message translates to:
  /// **'Flood'**
  String get flood;

  /// No description provided for @medical.
  ///
  /// In en, this message translates to:
  /// **'Medical'**
  String get medical;

  /// No description provided for @reportQueuedForSync.
  ///
  /// In en, this message translates to:
  /// **'{label} P0 #{id} queued for mesh sync'**
  String reportQueuedForSync(Object label, Object id);

  /// No description provided for @reportQueuedGeneric.
  ///
  /// In en, this message translates to:
  /// **'Report #{id} queued for next mesh sync'**
  String reportQueuedGeneric(Object id);

  /// No description provided for @openProfileTab.
  ///
  /// In en, this message translates to:
  /// **'Open the Profile tab'**
  String get openProfileTab;

  /// No description provided for @reportDetail.
  ///
  /// In en, this message translates to:
  /// **'Report detail'**
  String get reportDetail;

  /// No description provided for @timeFiled.
  ///
  /// In en, this message translates to:
  /// **'Filed {time}'**
  String timeFiled(Object time);

  /// No description provided for @type.
  ///
  /// In en, this message translates to:
  /// **'Type'**
  String get type;

  /// No description provided for @photo.
  ///
  /// In en, this message translates to:
  /// **'Photo'**
  String get photo;

  /// No description provided for @fullImageSyncing.
  ///
  /// In en, this message translates to:
  /// **'Full image syncing… {progress}%'**
  String fullImageSyncing(Object progress);

  /// No description provided for @evidenceChain.
  ///
  /// In en, this message translates to:
  /// **'Evidence chain'**
  String get evidenceChain;

  /// No description provided for @captured.
  ///
  /// In en, this message translates to:
  /// **'Captured'**
  String get captured;

  /// No description provided for @location.
  ///
  /// In en, this message translates to:
  /// **'Location'**
  String get location;

  /// No description provided for @accuracy.
  ///
  /// In en, this message translates to:
  /// **'Accuracy'**
  String get accuracy;

  /// No description provided for @distanceFromYou.
  ///
  /// In en, this message translates to:
  /// **'Distance from you'**
  String get distanceFromYou;

  /// No description provided for @description.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get description;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @timeline.
  ///
  /// In en, this message translates to:
  /// **'Timeline'**
  String get timeline;

  /// No description provided for @syncedLateMinutes.
  ///
  /// In en, this message translates to:
  /// **'synced {minutes}m after event'**
  String syncedLateMinutes(Object minutes);

  /// No description provided for @syncState.
  ///
  /// In en, this message translates to:
  /// **'Sync state'**
  String get syncState;

  /// No description provided for @queuedForSync.
  ///
  /// In en, this message translates to:
  /// **'Queued for server sync · priority position {position}'**
  String queuedForSync(Object position);

  /// No description provided for @reachedServer.
  ///
  /// In en, this message translates to:
  /// **'Reached server'**
  String get reachedServer;

  /// No description provided for @rejectionReason.
  ///
  /// In en, this message translates to:
  /// **'CPOC rejection — action required'**
  String get rejectionReason;

  /// No description provided for @reAttend.
  ///
  /// In en, this message translates to:
  /// **'Re-attend and re-shoot'**
  String get reAttend;

  /// No description provided for @rejectedBy.
  ///
  /// In en, this message translates to:
  /// **'Rejected by {actor} · {time}'**
  String rejectedBy(Object actor, Object time);

  /// No description provided for @reportsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} reports — {sector}'**
  String reportsCount(Object count, Object sector);

  /// No description provided for @newReport.
  ///
  /// In en, this message translates to:
  /// **'New report'**
  String get newReport;

  /// No description provided for @filtersNotWired.
  ///
  /// In en, this message translates to:
  /// **'Filters not wired yet'**
  String get filtersNotWired;

  /// No description provided for @reportComposerNotBuilt.
  ///
  /// In en, this message translates to:
  /// **'Report composer not built yet'**
  String get reportComposerNotBuilt;

  /// No description provided for @filter.
  ///
  /// In en, this message translates to:
  /// **'Filter'**
  String get filter;

  /// No description provided for @identity.
  ///
  /// In en, this message translates to:
  /// **'Identity'**
  String get identity;

  /// No description provided for @capabilities.
  ///
  /// In en, this message translates to:
  /// **'Capabilities'**
  String get capabilities;

  /// No description provided for @device.
  ///
  /// In en, this message translates to:
  /// **'Device'**
  String get device;

  /// No description provided for @shift.
  ///
  /// In en, this message translates to:
  /// **'Shift'**
  String get shift;

  /// No description provided for @session.
  ///
  /// In en, this message translates to:
  /// **'Session'**
  String get session;

  /// No description provided for @boundDevice.
  ///
  /// In en, this message translates to:
  /// **'Bound device'**
  String get boundDevice;

  /// No description provided for @meshNode.
  ///
  /// In en, this message translates to:
  /// **'Mesh node'**
  String get meshNode;

  /// No description provided for @oneDeviceNote.
  ///
  /// In en, this message translates to:
  /// **'One active device per responder is enforced. Re-binding requires CPOC approval.'**
  String get oneDeviceNote;

  /// No description provided for @hoursOnTask.
  ///
  /// In en, this message translates to:
  /// **'Hours on task'**
  String get hoursOnTask;

  /// No description provided for @lastCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Last check-in'**
  String get lastCheckIn;

  /// No description provided for @nextCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Next check-in due'**
  String get nextCheckIn;

  /// No description provided for @offlineCredentials.
  ///
  /// In en, this message translates to:
  /// **'Offline credentials valid for {hours}h {minutes}m'**
  String offlineCredentials(Object hours, Object minutes);

  /// No description provided for @logOut.
  ///
  /// In en, this message translates to:
  /// **'Log out'**
  String get logOut;

  /// No description provided for @logOutConfirm.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to log out?'**
  String get logOutConfirm;

  /// No description provided for @name.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get name;

  /// No description provided for @rank.
  ///
  /// In en, this message translates to:
  /// **'Rank'**
  String get rank;

  /// No description provided for @agency.
  ///
  /// In en, this message translates to:
  /// **'Agency'**
  String get agency;

  /// No description provided for @callsign.
  ///
  /// In en, this message translates to:
  /// **'Callsign'**
  String get callsign;

  /// No description provided for @serviceNumber.
  ///
  /// In en, this message translates to:
  /// **'Service number'**
  String get serviceNumber;

  /// No description provided for @assignedArea.
  ///
  /// In en, this message translates to:
  /// **'Assigned area'**
  String get assignedArea;

  /// No description provided for @selectIncidentType.
  ///
  /// In en, this message translates to:
  /// **'Select incident type'**
  String get selectIncidentType;

  /// No description provided for @selectSeverity.
  ///
  /// In en, this message translates to:
  /// **'Select severity'**
  String get selectSeverity;

  /// No description provided for @incidentType.
  ///
  /// In en, this message translates to:
  /// **'Incident type'**
  String get incidentType;

  /// No description provided for @severity.
  ///
  /// In en, this message translates to:
  /// **'Severity'**
  String get severity;

  /// No description provided for @descriptionHint.
  ///
  /// In en, this message translates to:
  /// **'Describe what you see'**
  String get descriptionHint;

  /// No description provided for @capturePhoto.
  ///
  /// In en, this message translates to:
  /// **'Capture photo'**
  String get capturePhoto;

  /// No description provided for @retakePhoto.
  ///
  /// In en, this message translates to:
  /// **'Retake photo'**
  String get retakePhoto;

  /// No description provided for @acquiringLocation.
  ///
  /// In en, this message translates to:
  /// **'Acquiring location…'**
  String get acquiringLocation;

  /// No description provided for @locationAcquired.
  ///
  /// In en, this message translates to:
  /// **'Location acquired'**
  String get locationAcquired;

  /// No description provided for @locationFailed.
  ///
  /// In en, this message translates to:
  /// **'Location unavailable'**
  String get locationFailed;

  /// No description provided for @proceedWithoutGps.
  ///
  /// In en, this message translates to:
  /// **'Proceed without GPS'**
  String get proceedWithoutGps;

  /// No description provided for @retryLocation.
  ///
  /// In en, this message translates to:
  /// **'Retry location'**
  String get retryLocation;

  /// No description provided for @submitReport.
  ///
  /// In en, this message translates to:
  /// **'Submit report'**
  String get submitReport;

  /// No description provided for @photoOptional.
  ///
  /// In en, this message translates to:
  /// **'Photo (optional)'**
  String get photoOptional;

  /// No description provided for @collapse.
  ///
  /// In en, this message translates to:
  /// **'Collapse'**
  String get collapse;

  /// No description provided for @roadBlocked.
  ///
  /// In en, this message translates to:
  /// **'Road blocked'**
  String get roadBlocked;

  /// No description provided for @bodyRecovered.
  ///
  /// In en, this message translates to:
  /// **'Body recovered'**
  String get bodyRecovered;

  /// No description provided for @landslide.
  ///
  /// In en, this message translates to:
  /// **'Landslide'**
  String get landslide;

  /// No description provided for @powerLine.
  ///
  /// In en, this message translates to:
  /// **'Power line'**
  String get powerLine;

  /// No description provided for @gasLeak.
  ///
  /// In en, this message translates to:
  /// **'Gas leak'**
  String get gasLeak;

  /// No description provided for @waterFood.
  ///
  /// In en, this message translates to:
  /// **'Water / food'**
  String get waterFood;

  /// No description provided for @other.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get other;

  /// No description provided for @flooding.
  ///
  /// In en, this message translates to:
  /// **'Flooding'**
  String get flooding;

  /// No description provided for @lifeAtImmediateRisk.
  ///
  /// In en, this message translates to:
  /// **'Life at immediate risk'**
  String get lifeAtImmediateRisk;

  /// No description provided for @trappedDrowningFire.
  ///
  /// In en, this message translates to:
  /// **'Trapped, drowning, fire with occupants'**
  String get trappedDrowningFire;

  /// No description provided for @seriousNotImmediate.
  ///
  /// In en, this message translates to:
  /// **'Serious, not immediate'**
  String get seriousNotImmediate;

  /// No description provided for @injuredStableIsolated.
  ///
  /// In en, this message translates to:
  /// **'Injured stable, isolated group'**
  String get injuredStableIsolated;

  /// No description provided for @infrastructureAccess.
  ///
  /// In en, this message translates to:
  /// **'Infrastructure / access'**
  String get infrastructureAccess;

  /// No description provided for @roadBlockedLineBridge.
  ///
  /// In en, this message translates to:
  /// **'Road blocked, line down, bridge damaged'**
  String get roadBlockedLineBridge;

  /// No description provided for @logisticsWelfare.
  ///
  /// In en, this message translates to:
  /// **'Logistics / welfare'**
  String get logisticsWelfare;

  /// No description provided for @supplyNeedSanitation.
  ///
  /// In en, this message translates to:
  /// **'Supply need, sanitation, damage survey'**
  String get supplyNeedSanitation;

  /// No description provided for @diagnose.
  ///
  /// In en, this message translates to:
  /// **'Diagnose'**
  String get diagnose;

  /// No description provided for @syncNow.
  ///
  /// In en, this message translates to:
  /// **'Sync now'**
  String get syncNow;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'hi', 'kn', 'ml', 'ta'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'hi':
      return AppLocalizationsHi();
    case 'kn':
      return AppLocalizationsKn();
    case 'ml':
      return AppLocalizationsMl();
    case 'ta':
      return AppLocalizationsTa();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
