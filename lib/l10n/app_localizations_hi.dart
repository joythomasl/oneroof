// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Hindi (`hi`).
class AppLocalizationsHi extends AppLocalizations {
  AppLocalizationsHi([String locale = 'hi']) : super(locale);

  @override
  String get appTitle => 'समन्वय रेस्पॉन्डर';

  @override
  String get home => 'होम';

  @override
  String get mesh => 'मेश';

  @override
  String get reports => 'रिपोर्ट';

  @override
  String get profile => 'प्रोफ़ाइल';

  @override
  String get account => 'खाता';

  @override
  String get elapsed => 'बीता समय';

  @override
  String get countdown => 'उलटी गिनती';

  @override
  String get sinceEmergencyDeclared => 'आपातकाल घोषित होने से';

  @override
  String toRecoveryPhase(Object hours, Object minutes) {
    return 'रिकवरी चरण तक $hoursघं $minutesमि';
  }

  @override
  String get recoveryPhaseDue => 'रिकवरी चरण देय है';

  @override
  String get yourStatus => 'आपकी स्थिति';

  @override
  String get tapToChange => 'बदलने के लिए नीचे टैप करें';

  @override
  String get selectDutyStatus => 'ड्यूटी स्थिति चुनें';

  @override
  String get available => 'उपलब्ध';

  @override
  String get enRoute => 'रास्ते में';

  @override
  String get engaged => 'कार्यरत';

  @override
  String get resting => 'विश्राम';

  @override
  String get offDuty => 'ड्यूटी समाप्त';

  @override
  String get readyForTasking => 'कार्य सौंपने के लिए तैयार';

  @override
  String get travellingToIncident => 'निर्धारित घटना तक यात्रा';

  @override
  String get activelyWorking => 'घटना पर सक्रिय कार्य';

  @override
  String get mandatoryRest => 'अनिवार्य विश्राम, उपलब्ध नहीं';

  @override
  String get shiftEnded => 'शिफ्ट समाप्त';

  @override
  String get linkedIncident => 'जुड़ी घटना आईडी';

  @override
  String get restDuration => 'विश्राम अवधि (मिनट)';

  @override
  String get continueLabel => 'जारी रखें';

  @override
  String get cancel => 'रद्द करें';

  @override
  String statusSetTo(Object status) {
    return 'स्थिति $status पर सेट';
  }

  @override
  String statusQueued(Object status) {
    return '$status स्थिति मेश सिंक के लिए कतार में है';
  }

  @override
  String statusSentNow(Object status) {
    return '$status स्थिति मेश पर भेजी गई';
  }

  @override
  String get changeStatus => 'स्थिति बदलें';

  @override
  String get quickActions => 'त्वरित कार्रवाई';

  @override
  String get fileNewReport => 'नई रिपोर्ट दर्ज करें';

  @override
  String get casualtyHazardResource => 'हताहत, खतरा, संसाधन अनुरोध';

  @override
  String get quickReportP0 => 'त्वरित रिपोर्ट — P0';

  @override
  String get trapped => 'फंसा हुआ';

  @override
  String get fire => 'आग';

  @override
  String get flood => 'बाढ़';

  @override
  String get medical => 'चिकित्सा';

  @override
  String reportQueuedForSync(Object label, Object id) {
    return '$label P0 #$id मेश सिंक कतार में';
  }

  @override
  String reportQueuedGeneric(Object id) {
    return 'रिपोर्ट #$id अगले मेश सिंक के लिए कतार में';
  }

  @override
  String get openProfileTab => 'प्रोफ़ाइल टैब खोलें';

  @override
  String get reportDetail => 'रिपोर्ट विवरण';

  @override
  String timeFiled(Object time) {
    return 'दर्ज $time';
  }

  @override
  String get type => 'प्रकार';

  @override
  String get photo => 'फोटो';

  @override
  String fullImageSyncing(Object progress) {
    return 'पूर्ण चित्र सिंक हो रहा है… $progress%';
  }

  @override
  String get evidenceChain => 'साक्ष्य शृंखला';

  @override
  String get captured => 'कैप्चर';

  @override
  String get location => 'स्थान';

  @override
  String get accuracy => 'सटीकता';

  @override
  String get distanceFromYou => 'आपसे दूरी';

  @override
  String get description => 'विवरण';

  @override
  String get language => 'भाषा';

  @override
  String get timeline => 'समयरेखा';

  @override
  String syncedLateMinutes(Object minutes) {
    return 'घटना के $minutesमि बाद सिंक हुआ';
  }

  @override
  String get syncState => 'सिंक स्थिति';

  @override
  String queuedForSync(Object position) {
    return 'सर्वर सिंक कतार · प्राथमिकता स्थान $position';
  }

  @override
  String get reachedServer => 'सर्वर तक पहुंचा';

  @override
  String get rejectionReason => 'CPOC अस्वीकृति — कार्रवाई आवश्यक';

  @override
  String get reAttend => 'फिर जाएँ और दोबारा तस्वीर लें';

  @override
  String rejectedBy(Object actor, Object time) {
    return '$actor द्वारा अस्वीकृत · $time';
  }

  @override
  String reportsCount(Object count, Object sector) {
    return '$count रिपोर्ट — $sector';
  }

  @override
  String get newReport => 'नई रिपोर्ट';

  @override
  String get filtersNotWired => 'फ़िल्टर अभी जुड़े नहीं हैं';

  @override
  String get reportComposerNotBuilt => 'रिपोर्ट कम्पोज़र अभी नहीं बना है';

  @override
  String get filter => 'फ़िल्टर';

  @override
  String get identity => 'पहचान';

  @override
  String get capabilities => 'क्षमताएँ';

  @override
  String get device => 'डिवाइस';

  @override
  String get shift => 'शिफ्ट';

  @override
  String get session => 'सत्र';

  @override
  String get boundDevice => 'बद्ध डिवाइस';

  @override
  String get meshNode => 'मेश नोड';

  @override
  String get oneDeviceNote =>
      'प्रत्येक रेस्पॉन्डर के लिए एक सक्रिय डिवाइस लागू है। दोबारा बाइंडिंग के लिए CPOC अनुमोदन चाहिए।';

  @override
  String get hoursOnTask => 'कार्य के घंटे';

  @override
  String get lastCheckIn => 'अंतिम चेक-इन';

  @override
  String get nextCheckIn => 'अगला चेक-इन';

  @override
  String offlineCredentials(Object hours, Object minutes) {
    return 'ऑफ़लाइन प्रमाण-पत्र $hoursघं $minutesमि तक मान्य';
  }

  @override
  String get logOut => 'लॉग आउट';

  @override
  String get logOutConfirm => 'क्या आप लॉग आउट करना चाहते हैं?';

  @override
  String get name => 'नाम';

  @override
  String get rank => 'पद';

  @override
  String get agency => 'एजेंसी';

  @override
  String get callsign => 'कॉलसाइन';

  @override
  String get serviceNumber => 'सेवा संख्या';

  @override
  String get assignedArea => 'निर्धारित क्षेत्र';

  @override
  String get selectIncidentType => 'घटना प्रकार चुनें';

  @override
  String get selectSeverity => 'गंभीरता चुनें';

  @override
  String get incidentType => 'घटना प्रकार';

  @override
  String get severity => 'गंभीरता';

  @override
  String get descriptionHint => 'आप क्या देख रहे हैं वर्णन करें';

  @override
  String get capturePhoto => 'फोटो लें';

  @override
  String get retakePhoto => 'फिर से फोटो लें';

  @override
  String get acquiringLocation => 'स्थान प्राप्त हो रहा है…';

  @override
  String get locationAcquired => 'स्थान प्राप्त';

  @override
  String get locationFailed => 'स्थान अनुपलब्ध';

  @override
  String get proceedWithoutGps => 'GPS के बिना आगे बढ़ें';

  @override
  String get retryLocation => 'स्थान पुनः प्रयास';

  @override
  String get submitReport => 'रिपोर्ट जमा करें';

  @override
  String get photoOptional => 'फोटो (वैकल्पिक)';

  @override
  String get collapse => 'ढहना';

  @override
  String get roadBlocked => 'सड़क अवरुद्ध';

  @override
  String get bodyRecovered => 'शव बरामद';

  @override
  String get landslide => 'भूस्खलन';

  @override
  String get powerLine => 'बिजली की तार';

  @override
  String get gasLeak => 'गैस रिसाव';

  @override
  String get waterFood => 'पानी / भोजन';

  @override
  String get other => 'अन्य';

  @override
  String get flooding => 'बाढ़';

  @override
  String get lifeAtImmediateRisk => 'तत्काल जीवन खतरे में';

  @override
  String get trappedDrowningFire => 'फंसे, डूबते, आग में फंसे';

  @override
  String get seriousNotImmediate => 'गंभीर, तत्काल नहीं';

  @override
  String get injuredStableIsolated => 'घायल स्थिर, अलग-थलग समूह';

  @override
  String get infrastructureAccess => 'अवसंरचना / पहुँच';

  @override
  String get roadBlockedLineBridge => 'सड़क अवरुद्ध, तार गिरी, पुल क्षतिग्रस्त';

  @override
  String get logisticsWelfare => 'रसद / कल्याण';

  @override
  String get supplyNeedSanitation => 'आपूर्ति, स्वच्छता, क्षति सर्वेक्षण';

  @override
  String get diagnose => 'निदान';

  @override
  String get syncNow => 'अभी सिंक करें';
}
