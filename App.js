
import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

/* =========================
   COLOURS
========================= */

const C = {
  bg: "#070B13",
  card: "#101827",
  panel: "#172235",
  border: "#29384D",
  text: "#F4F7FC",
  muted: "#91A0B5",
  teal: "#5CE6C3",
  blue: "#62A8FF",
  orange: "#FFB86B",
  red: "#FF7373",
  purple: "#B69CFF",
};

/* =========================
   SIX SCENARIOS
========================= */

const SCENARIOS = [
  {
    id: "S1",
    type: "V2G",
    route: "Home → Home",
    factor: 1.00,
    description: "Charge at home and discharge to the grid.",
  },
  {
    id: "S2",
    type: "V2G",
    route: "Home → Station",
    factor: 0.94,
    description: "Charge at home and discharge at a station.",
  },
  {
    id: "S3",
    type: "V2G",
    route: "Station → Home",
    factor: 0.91,
    description: "Charge at a station and discharge at home.",
  },
  {
    id: "S4",
    type: "V2G",
    route: "Station → Station",
    factor: 0.88,
    description: "Charge and discharge at stations.",
  },
  {
    id: "S5",
    type: "V2H",
    route: "Station → Home",
    factor: 0.82,
    description: "Charge at a station and supply household demand.",
  },
  {
    id: "S6",
    type: "V2H",
    route: "Home → Home",
    factor: 0.76,
    description: "Charge at home and supply household demand.",
  },
];

/* =========================
   DEFAULT INPUTS
========================= */

const DEFAULTS = {
  battery: "50",
  dailyEnergy: "20",
  efficiency: "90",
  operatingDays: "300",
  lifetime: "10",
  discountRate: "10",
  escalation: "3",
  chargerCost: "500000",
  connectionCost: "100000",
  installationCost: "50000",
  initialMaintenance: "19500",
  annualMaintenance: "5000",
  adminCost: "3",
  degradationCost: "15",
  utilityInvestment: "100000",
  utilityAnnualCost: "7500",
  chargingTariff: "33",
  exportTariff: "45.80",
  householdTariff: "47",
  utilityEnablingCost: "100000",
  utilityMaintenance: "7500",
  energyCost: "45.80",
};

/* =========================
   CALCULATIONS
========================= */

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (value) =>
  "Rs. " + Math.round(value).toLocaleString("en-US");

function capitalRecovery(rate, years) {
  if (years <= 0) return 0;

  const r = rate / 100;
  if (r === 0) return 1 / years;

  return (
    (r * Math.pow(1 + r, years)) /
    (Math.pow(1 + r, years) - 1)
  );
}

/*
 Prototype calculation only.
 Validate assumptions and formulas against
 the approved LECO research workbook before
 using results as research findings.
*/

function calculate(inputs, scenario) {
  const efficiency = num(inputs.efficiency) / 100;

  const dailyEnergy =
    Math.min(
      num(inputs.dailyEnergy),
      num(inputs.battery) * efficiency
    ) * scenario.factor;

  const annualEnergy =
    dailyEnergy * num(inputs.operatingDays);

  const annualCharge =
    efficiency > 0 ? annualEnergy / efficiency : 0;

  const recovery = capitalRecovery(
    num(inputs.discountRate),
    num(inputs.lifetime)
  );

  const ownerCapital =
    num(inputs.chargerCost) +
    num(inputs.connectionCost) +
    num(inputs.installationCost) +
    num(inputs.initialMaintenance);

  const ownerAnnualCapital = ownerCapital * recovery;
  const ownerCharging = annualCharge * num(inputs.chargingTariff);
  const ownerDegradation = annualEnergy * num(inputs.degradationCost);
  const ownerAdmin = annualEnergy * num(inputs.adminCost);

  const ownerTotal =
    ownerAnnualCapital +
    num(inputs.annualMaintenance) +
    ownerCharging +
    ownerDegradation +
    ownerAdmin;

  const utilityCapital =
    num(inputs.utilityInvestment) +
    num(inputs.utilityEnablingCost);

  const utilityAnnualCapital = utilityCapital * recovery;
  const utilityEnergy = annualEnergy * num(inputs.energyCost);

  const utilityTotal =
    utilityAnnualCapital +
    num(inputs.utilityAnnualCost) +
    num(inputs.utilityMaintenance) +
    utilityEnergy;

  const prosumerBEP =
    annualEnergy > 0 ? ownerTotal / annualEnergy : 0;

  const utilityBEP =
    annualEnergy > 0 ? utilityTotal / annualEnergy : 0;

  return {
    ...scenario,
    dailyEnergy,
    annualEnergy,
    annualCharge,
    ownerTotal,
    utilityTotal,
    prosumerBEP,
    utilityBEP,
    gap: Math.abs(utilityBEP - prosumerBEP),
    viable: utilityBEP > prosumerBEP,
  };
}

/* =========================
   REUSABLE COMPONENTS
   Kept outside App to prevent
   keyboard focus problems.
========================= */

function Field({
  label,
  value,
  onChangeText,
  suffix,
  keyboardType = "numeric",
  secureTextEntry = false,
  placeholder = "Enter value",
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          placeholder={placeholder}
          placeholderTextColor="#687990"
          style={styles.input}
          autoCapitalize={
            keyboardType === "email-address" ? "none" : "sentences"
          }
          autoCorrect={keyboardType !== "email-address"}
          blurOnSubmit={false}
        />

        {!!suffix && (
          <Text style={styles.suffix}>{suffix}</Text>
        )}
      </View>
    </View>
  );
}

function Button({ title, onPress, secondary = false }) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.buttonSecondary,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && styles.buttonSecondaryText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function Heading({ title, subtitle }) {
  return (
    <View style={styles.headingBlock}>
      <Text style={styles.heading}>{title}</Text>
      {!!subtitle && <Text style={styles.muted}>{subtitle}</Text>}
    </View>
  );
}

function Metric({ label, value, color = C.text }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

function BarChart({ results }) {
  const max = Math.max(
    1,
    ...results.map((item) =>
      Math.max(item.prosumerBEP, item.utilityBEP)
    )
  );

  return (
    <View style={styles.chart}>
      {results.map((item) => (
        <View key={item.id} style={styles.barGroup}>
          <Text style={styles.chartLabel}>{item.id}</Text>

          <View style={styles.barPair}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(
                      3,
                      (120 * item.prosumerBEP) / max
                    ),
                    backgroundColor: C.teal,
                  },
                ]}
              />
            </View>

            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(
                      3,
                      (120 * item.utilityBEP) / max
                    ),
                    backgroundColor: C.blue,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/* =========================
   MAIN APP
========================= */

export default function App() {
  // Entry flow: welcome → login/register → dashboard
  const [screen, setScreen] = useState("welcome");
  const [role, setRole] = useState("Customer");

  // Registration details
  const [fullName, setFullName] = useState("");
  const [initials, setInitials] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [photo, setPhoto] = useState(null);

  // Login details
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Temporary account for this app session
  const [account, setAccount] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [error, setError] = useState("");

  // Analysis
  const [inputs, setInputs] = useState(DEFAULTS);
  const [results, setResults] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState("S1");

  const update = (key, value) => {
    setInputs((old) => ({
      ...old,
      [key]: value,
    }));
    setResults(null);
  };

  const calculated = useMemo(
    () => results || [],
    [results]
  );

  const best = calculated.length
    ? [...calculated].sort((a, b) => b.gap - a.gap)[0]
    : null;

  const selected = calculated.find(
    (item) => item.id === selectedScenario
  );

  /* =========================
     PROFILE PICTURE
  ========================= */

  const choosePhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Please allow photo library access to select a profile picture."
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });

      if (
        !result.canceled &&
        result.assets &&
        result.assets.length > 0
      ) {
        setPhoto(result.assets[0].uri);
      }
    } catch (e) {
      console.log("Photo selection error:", e);
      Alert.alert(
        "Photo selection error",
        "Please try selecting your picture again."
      );
    }
  };

  /* =========================
     VALIDATION
  ========================= */

  const validateRegistration = () => {
    if (!fullName.trim()) {
      return "Please enter your full name.";
    }

    if (!initials.trim()) {
      return "Please enter your initials with name.";
    }

    if (
      !email.trim() ||
      !email.includes("@") ||
      !email.includes(".")
    ) {
      return "Please enter a valid email address.";
    }

    if (password.length < 6) {
      return "Password must contain at least 6 characters.";
    }

    if (mobile.trim().length < 9) {
      return "Please enter a valid mobile number.";
    }

    return "";
  };

  const validateInputs = () => {
    const required = [
      "battery",
      "dailyEnergy",
      "efficiency",
      "operatingDays",
      "lifetime",
      "discountRate",
    ];

    for (const key of required) {
      if (num(inputs[key]) <= 0) {
        return "Please enter positive values for all required fields.";
      }
    }

    if (num(inputs.efficiency) > 100) {
      return "Efficiency cannot be greater than 100%.";
    }

    return "";
  };

  /* =========================
     CREATE ACCOUNT
  ========================= */

  const createAccount = () => {
    const problem = validateRegistration();

    if (problem) {
      setError(problem);
      return;
    }

    const newAccount = {
      fullName: fullName.trim(),
      initials: initials.trim(),
      email: email.trim().toLowerCase(),
      password,
      mobile: mobile.trim(),
      photo,
      role,
    };

    setAccount(newAccount);
    setError("");
    setScreen("dashboard");
  };

  /* =========================
     LOGIN
  ========================= */

  const login = () => {
    if (!loginEmail.trim() || !loginPassword) {
      setError("Please enter your email address and password.");
      return;
    }

    if (!account) {
      setError("No account has been created in this app session. Please create an account first.");
      return;
    }

    if (
      loginEmail.trim().toLowerCase() !== account.email ||
      loginPassword !== account.password
    ) {
      setError("Incorrect email address or password.");
      return;
    }

    setFullName(account.fullName);
    setInitials(account.initials);
    setEmail(account.email);
    setMobile(account.mobile);
    setPhoto(account.photo);
    setRole(account.role);

    setError("");
    setScreen("dashboard");
  };

  const signOut = () => {
    setResults(null);
    setError("");
    setLoginEmail("");
    setLoginPassword("");
    setScreen("welcome");
  };

  /* =========================
     RUN ANALYSIS
  ========================= */

  const findBest = () => {
    const problem = validateInputs();

    if (problem) {
      setError(problem);
      return;
    }

    const output = SCENARIOS.map((scenario) =>
      calculate(inputs, scenario)
    );

    setResults(output);
    setSelectedScenario("S1");
    setError("");
    setScreen("results");
  };

  /* =========================
     HEADER
  ========================= */

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>EV ENERGY ADVISOR</Text>
        <Text style={styles.headerSub}>
          V2G & V2H ANALYSIS PLATFORM
        </Text>
      </View>

      <View style={styles.roleBadge}>
        <Text style={styles.roleBadgeText}>
          {role.toUpperCase()}
        </Text>
      </View>
    </View>
  );

  /* =========================
     WELCOME SCREEN
  ========================= */

  const renderWelcome = () => (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.welcomeContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeLogo}>
          <Text style={styles.welcomeLogoText}>EV</Text>
          <View style={styles.logoDot} />
        </View>

        <Text style={styles.welcomeSmall}>
          SMART ENERGY · SMARTER MOBILITY
        </Text>

        <Text style={styles.welcomeMainTitle}>
          Welcome to
        </Text>

        <Text style={styles.welcomeAppTitle}>
          EV Energy Advisor
        </Text>

        <Text style={styles.welcomeDescription}>
          Discover smarter ways to manage your electric vehicle energy.
          Explore Vehicle-to-Grid and Vehicle-to-Home opportunities
          through intelligent economic analysis.
        </Text>

        <View style={styles.welcomeFeatures}>
          <View style={styles.welcomeFeature}>
            <Text style={styles.welcomeFeatureIcon}>⚡</Text>
            <Text style={styles.welcomeFeatureTitle}>V2G Analysis</Text>
            <Text style={styles.welcomeFeatureText}>
              Vehicle to Grid
            </Text>
          </View>

          <View style={styles.welcomeFeature}>
            <Text style={styles.welcomeFeatureIcon}>⌂</Text>
            <Text style={styles.welcomeFeatureTitle}>V2H Analysis</Text>
            <Text style={styles.welcomeFeatureText}>
              Vehicle to Home
            </Text>
          </View>

          <View style={styles.welcomeFeature}>
            <Text style={styles.welcomeFeatureIcon}>▥</Text>
            <Text style={styles.welcomeFeatureTitle}>BEP Results</Text>
            <Text style={styles.welcomeFeatureText}>
              Six scenarios
            </Text>
          </View>
        </View>

        <View style={styles.welcomeActions}>
          <Text style={styles.welcomeActionTitle}>
            Get started
          </Text>

          <Text style={styles.welcomeActionSubtitle}>
            Sign in to your account or create a new one.
          </Text>

          <Button
            title="Login to your account →"
            onPress={() => {
              setError("");
              setScreen("login");
            }}
          />

          <Button
            title="Create a new account"
            secondary
            onPress={() => {
              setError("");
              setScreen("register");
            }}
          />
        </View>

        <Text style={styles.loginFooter}>
          EV ENERGY ADVISOR · V2G · V2H
        </Text>
      </ScrollView>
    </SafeAreaView>
  );

  /* =========================
     LOGIN SCREEN
  ========================= */

  const renderLogin = () => (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.loginContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setError("");
              setScreen("welcome");
            }}
          >
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>

          <View style={styles.loginLogo}>
            <Text style={styles.loginLogoText}>EV</Text>
          </View>

          <Text style={styles.loginTitle}>Welcome back!</Text>

          <Text style={styles.loginSubtitle}>
            Login to continue to your EV Energy Advisor.
          </Text>

          <Card>
            <Text style={styles.cardTitle}>Login to your account</Text>

            <Field
              label="Email address"
              value={loginEmail}
              onChangeText={setLoginEmail}
              keyboardType="email-address"
              placeholder="name@example.com"
            />

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>

              <View style={styles.passwordRow}>
                <TextInput
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#687990"
                  secureTextEntry={!showLoginPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  blurOnSubmit={false}
                  style={styles.passwordInput}
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowLoginPassword((v) => !v)
                  }
                >
                  <Text style={styles.showPassword}>
                    {showLoginPassword ? "HIDE" : "SHOW"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Button
              title="Login →"
              onPress={login}
            />

            <View style={styles.divider} />

            <Text style={styles.mutedCenter}>
              Don't have an account yet?
            </Text>

            <Button
              title="Create an account"
              secondary
              onPress={() => {
                setError("");
                setScreen("register");
              }}
            />
          </Card>

          <Text style={styles.loginFooter}>
            EV ENERGY ADVISOR · V2G · V2H
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  /* =========================
     REGISTER SCREEN
  ========================= */

  const renderRegister = () => (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.loginContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setError("");
              setScreen("welcome");
            }}
          >
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>

          <View style={styles.loginLogo}>
            <Text style={styles.loginLogoText}>EV</Text>
          </View>

          <Text style={styles.loginTitle}>Create your account</Text>

          <Text style={styles.loginSubtitle}>
            Join the EV Energy Advisor platform.
          </Text>

          <Card>
            <Text style={styles.cardTitle}>Profile information</Text>

            <TouchableOpacity
              style={styles.photoPicker}
              onPress={choosePhoto}
              activeOpacity={0.8}
            >
              {photo ? (
                <Image
                  source={{ uri: photo }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoIcon}>＋</Text>
                  <Text style={styles.photoText}>
                    Add profile picture
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <Field
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              keyboardType="default"
              placeholder="Enter your full name"
            />

            <Field
              label="Initials with name"
              value={initials}
              onChangeText={setInitials}
              keyboardType="default"
              placeholder="Example: I. M. Mohamed"
            />

            <Field
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholder="name@example.com"
            />

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>

              <View style={styles.passwordRow}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create a password"
                  placeholderTextColor="#687990"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  blurOnSubmit={false}
                  style={styles.passwordInput}
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowPassword((v) => !v)
                  }
                >
                  <Text style={styles.showPassword}>
                    {showPassword ? "HIDE" : "SHOW"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Field
              label="Mobile number"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              placeholder="Enter mobile number"
            />

            <View style={styles.divider} />

            <Text style={styles.cardTitle}>
              Select your account type
            </Text>

            <Text style={styles.muted}>
              Choose the role that matches how you will use the application.
            </Text>

            <TouchableOpacity
              style={[
                styles.roleCard,
                role === "Customer" && styles.roleCardActive,
              ]}
              onPress={() => setRole("Customer")}
            >
              <Text style={styles.roleCardIcon}>🚗</Text>

              <View style={{ flex: 1 }}>
                <Text style={styles.roleCardTitle}>EV Customer</Text>
                <Text style={styles.roleCardDescription}>
                  EV details, charging costs, V2G/V2H options and personal BEP analysis.
                </Text>
              </View>

              <Text style={styles.radioText}>
                {role === "Customer" ? "●" : "○"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleCard,
                role === "Utility Officer" && styles.roleCardActive,
              ]}
              onPress={() => setRole("Utility Officer")}
            >
              <Text style={styles.roleCardIcon}>⚡</Text>

              <View style={{ flex: 1 }}>
                <Text style={styles.roleCardTitle}>Utility Officer</Text>
                <Text style={styles.roleCardDescription}>
                  Utility investment, network costs, tariffs and advanced six-scenario BEP comparison.
                </Text>
              </View>

              <Text style={styles.radioText}>
                {role === "Utility Officer" ? "●" : "○"}
              </Text>
            </TouchableOpacity>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Button
              title="Create account and continue →"
              onPress={createAccount}
            />

            <View style={styles.divider} />

            <Text style={styles.mutedCenter}>
              Already have an account?
            </Text>

            <Button
              title="Login instead"
              secondary
              onPress={() => {
                setError("");
                setScreen("login");
              }}
            />
          </Card>

          <Text style={styles.loginFooter}>
            EV ENERGY ADVISOR · V2G · V2H
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  /* =========================
     DASHBOARD
  ========================= */

  const renderDashboard = () => (
    <>
      {renderHeader()}

      <View style={styles.welcomeBanner}>
        <Text style={styles.eyebrow}>WELCOME</Text>

        <View style={styles.welcomeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeTitle}>
              Hello, {fullName.trim().split(" ")[0]} 👋
            </Text>

            <Text style={styles.welcomeDescription}>
              {role === "Customer"
                ? "Explore your EV energy and charging opportunities."
                : "Monitor utility assumptions and evaluate V2G/V2H implementation."}
            </Text>
          </View>

          {photo ? (
            <Image
              source={{ uri: photo }}
              style={styles.smallProfileImage}
            />
          ) : (
            <View style={styles.smallProfile}>
              <Text style={styles.smallProfileText}>
                {initials.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bannerFooter}>
          <Text style={styles.bannerCaption}>ENERGY ANALYSIS</Text>
          <Text style={styles.readyCaption}>● READY</Text>
        </View>
      </View>

      <Heading
        title={
          role === "Customer" ? "Your EV overview" : "Utility overview"
        }
        subtitle={
          role === "Customer"
            ? "Your electric vehicle information."
            : "Your utility analysis workspace."
        }
      />

      <View style={styles.overviewGrid}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewIcon}>🔋</Text>
          <Text style={styles.overviewLabel}>Battery capacity</Text>
          <Text style={styles.overviewValue}>{inputs.battery} kWh</Text>
        </View>

        <View style={styles.overviewCard}>
          <Text style={styles.overviewIcon}>⚡</Text>
          <Text style={styles.overviewLabel}>Daily energy</Text>
          <Text style={styles.overviewValue}>{inputs.dailyEnergy} kWh</Text>
        </View>

        <View style={styles.overviewCard}>
          <Text style={styles.overviewIcon}>◈</Text>
          <Text style={styles.overviewLabel}>Scenarios</Text>
          <Text style={styles.overviewValue}>06</Text>
        </View>

        <View style={styles.overviewCard}>
          <Text style={styles.overviewIcon}>◷</Text>
          <Text style={styles.overviewLabel}>Lifetime</Text>
          <Text style={styles.overviewValue}>{inputs.lifetime} years</Text>
        </View>
      </View>

      <Card>
        <Text style={styles.cardTitle}>
          {role === "Customer"
            ? "Your energy opportunities"
            : "Utility analysis workspace"}
        </Text>

        <Text style={styles.muted}>
          {role === "Customer"
            ? "Compare charging and discharging routes to explore the economic potential of your EV."
            : "Configure utility-side investment, enabling costs, operating costs and energy cost assumptions."}
        </Text>

        <View style={styles.featurePillRow}>
          <Text style={styles.featurePill}>V2G</Text>
          <Text style={styles.featurePill}>V2H</Text>
          <Text style={styles.featurePill}>BEP analysis</Text>
        </View>

        <Button
          title={
            role === "Customer"
              ? "Enter EV details →"
              : "Open utility parameters →"
          }
          onPress={() => setScreen("inputs")}
        />
      </Card>

      <Heading title="Quick access" />

      {[
        [
          "⚙",
          role === "Customer"
            ? "EV and cost inputs"
            : "Technical and financial inputs",
          "Configure your analysis parameters.",
          "inputs",
        ],
        [
          "◈",
          "Six operating scenarios",
          "Explore V2G and V2H routes.",
          "scenarios",
        ],
        [
          "○",
          "My profile",
          "View your account details.",
          "profile",
        ],
      ].map(([icon, title, subtitle, target]) => (
        <TouchableOpacity
          key={target}
          style={styles.actionCard}
          onPress={() => setScreen(target)}
        >
          <Text style={styles.actionIcon}>{icon}</Text>

          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>{title}</Text>
            <Text style={styles.actionSubtitle}>{subtitle}</Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      ))}
    </>
  );

  /* =========================
     INPUTS SCREEN
  ========================= */

  const renderInputs = () => (
    <>
      {renderHeader()}

      <Heading
        title={
          role === "Customer" ? "EV Parameters" : "Utility Parameters"
        }
        subtitle={
          role === "Customer"
            ? "Enter your EV and personal energy assumptions."
            : "Configure technical, utility and financial assumptions."
        }
      />

      <Card>
        <Text style={styles.cardTitle}>01 · EV and operation</Text>

        <Field
          label="Battery capacity"
          value={inputs.battery}
          suffix="kWh"
          onChangeText={(v) => update("battery", v)}
        />

        <Field
          label="Daily discharged energy"
          value={inputs.dailyEnergy}
          suffix="kWh/day"
          onChangeText={(v) => update("dailyEnergy", v)}
        />

        <Field
          label="System efficiency"
          value={inputs.efficiency}
          suffix="%"
          onChangeText={(v) => update("efficiency", v)}
        />

        <Field
          label="Operating days per year"
          value={inputs.operatingDays}
          suffix="days"
          onChangeText={(v) => update("operatingDays", v)}
        />

        <Field
          label="Project lifetime"
          value={inputs.lifetime}
          suffix="years"
          onChangeText={(v) => update("lifetime", v)}
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>02 · Customer financial inputs</Text>

        <Field
          label="Charger cost"
          value={inputs.chargerCost}
          suffix="Rs."
          onChangeText={(v) => update("chargerCost", v)}
        />

        <Field
          label="Connection cost"
          value={inputs.connectionCost}
          suffix="Rs."
          onChangeText={(v) => update("connectionCost", v)}
        />

        <Field
          label="Installation cost"
          value={inputs.installationCost}
          suffix="Rs."
          onChangeText={(v) => update("installationCost", v)}
        />

        <Field
          label="Initial maintenance cost"
          value={inputs.initialMaintenance}
          suffix="Rs."
          onChangeText={(v) => update("initialMaintenance", v)}
        />

        <Field
          label="Annual maintenance cost"
          value={inputs.annualMaintenance}
          suffix="Rs./year"
          onChangeText={(v) => update("annualMaintenance", v)}
        />

        <Field
          label="Administration cost"
          value={inputs.adminCost}
          suffix="Rs./kWh"
          onChangeText={(v) => update("adminCost", v)}
        />

        <Field
          label="Battery degradation cost"
          value={inputs.degradationCost}
          suffix="Rs./kWh"
          onChangeText={(v) => update("degradationCost", v)}
        />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>03 · Tariff assumptions</Text>

        <Field
          label="Charging tariff"
          value={inputs.chargingTariff}
          suffix="Rs./kWh"
          onChangeText={(v) => update("chargingTariff", v)}
        />

        <Field
          label="Export tariff"
          value={inputs.exportTariff}
          suffix="Rs./kWh"
          onChangeText={(v) => update("exportTariff", v)}
        />

        <Field
          label="Household tariff"
          value={inputs.householdTariff}
          suffix="Rs./kWh"
          onChangeText={(v) => update("householdTariff", v)}
        />
      </Card>

      {role === "Utility Officer" && (
        <Card style={styles.utilityCard}>
          <Text style={styles.utilityHeading}>
            UTILITY OFFICER · ADVANCED
          </Text>

          <Text style={styles.cardTitle}>04 · Utility investment</Text>
          <Text style={styles.muted}>
            Additional utility parameters.
          </Text>

          <Field
            label="Utility investment per customer"
            value={inputs.utilityInvestment}
            suffix="Rs."
            onChangeText={(v) => update("utilityInvestment", v)}
          />

          <Field
            label="Utility enabling cost per customer"
            value={inputs.utilityEnablingCost}
            suffix="Rs."
            onChangeText={(v) => update("utilityEnablingCost", v)}
          />

          <Field
            label="Annual utility operating cost"
            value={inputs.utilityAnnualCost}
            suffix="Rs./year"
            onChangeText={(v) => update("utilityAnnualCost", v)}
          />

          <Field
            label="Annual utility maintenance"
            value={inputs.utilityMaintenance}
            suffix="Rs./year"
            onChangeText={(v) => update("utilityMaintenance", v)}
          />

          <Field
            label="Utility energy cost"
            value={inputs.energyCost}
            suffix="Rs./kWh"
            onChangeText={(v) => update("energyCost", v)}
          />
        </Card>
      )}

      <Card>
        <Text style={styles.cardTitle}>05 · Economic assumptions</Text>

        <Field
          label="Discount rate"
          value={inputs.discountRate}
          suffix="%"
          onChangeText={(v) => update("discountRate", v)}
        />

        <Field
          label="Annual escalation rate"
          value={inputs.escalation}
          suffix="%"
          onChangeText={(v) => update("escalation", v)}
        />
      </Card>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.analysisPanel}>
        <Text style={styles.cardTitle}>Ready to analyse?</Text>

        <Text style={styles.muted}>
          Press the button below to calculate and display all six scenario results.
        </Text>

        <Button
          title="Find the Best Scenario →"
          onPress={findBest}
        />
      </View>
    </>
  );

  /* =========================
     SCENARIOS SCREEN
  ========================= */

  const renderScenarios = () => (
    <>
      {renderHeader()}

      <Heading
        title="Operating Scenarios"
        subtitle="Six V2G and V2H routes."
      />

      {SCENARIOS.map((scenario) => (
        <Card key={scenario.id}>
          <View style={styles.scenarioTop}>
            <Text style={styles.scenarioId}>{scenario.id}</Text>
            <Text style={styles.scenarioType}>{scenario.type}</Text>
          </View>

          <Text style={styles.cardTitle}>{scenario.route}</Text>
          <Text style={styles.muted}>{scenario.description}</Text>
        </Card>
      ))}
    </>
  );

  /* =========================
     RESULTS SCREEN
  ========================= */

  const renderResults = () => {
    if (!calculated.length) {
      return (
        <>
          {renderHeader()}

          <Card>
            <Text style={styles.cardTitle}>No analysis results yet</Text>

            <Text style={styles.muted}>
              Enter your parameters and press Find the Best Scenario first.
            </Text>

            <Button
              title="Enter parameters"
              onPress={() => setScreen("inputs")}
            />
          </Card>
        </>
      );
    }

    return (
      <>
        {renderHeader()}

        <Heading
          title="Analysis Results"
          subtitle="Completed six-scenario comparison."
        />

        <Card style={styles.bestCard}>
          <Text style={styles.eyebrow}>HIGHEST CALCULATED BEP GAP</Text>

          <Text style={styles.bestId}>{best.id}</Text>

          <Text style={styles.cardTitle}>
            {best.type} · {best.route}
          </Text>

          <View style={styles.divider} />

          <View style={styles.metricRow}>
            <Metric
              label="Prosumer BEP"
              value={best.prosumerBEP.toFixed(2)}
              color={C.teal}
            />

            <Metric
              label="Utility BEP"
              value={best.utilityBEP.toFixed(2)}
              color={C.blue}
            />

            <Metric
              label="BEP gap"
              value={best.gap.toFixed(2)}
            />
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Prosumer vs Utility BEP</Text>

          <View style={styles.legend}>
            <Text style={styles.legendTeal}>● Prosumer</Text>
            <Text style={styles.legendBlue}>● Utility</Text>
          </View>

          <BarChart results={calculated} />

          <Text style={styles.chartNote}>
            BEP values in Rs./kWh.
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>
            Detailed scenario comparison
          </Text>

          {calculated.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.resultRow,
                selectedScenario === item.id && styles.resultSelected,
              ]}
              onPress={() => setSelectedScenario(item.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.resultId}>
                  {item.id} · {item.type}
                </Text>

                <Text style={styles.muted}>{item.route}</Text>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.resultTeal}>
                  {item.prosumerBEP.toFixed(2)}
                </Text>

                <Text style={styles.resultBlue}>
                  {item.utilityBEP.toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          <Text style={styles.chartNote}>
            Teal = Prosumer BEP · Blue = Utility BEP.
            Select a scenario for details.
          </Text>
        </Card>

        {!!selected && (
          <Card>
            <Text style={styles.cardTitle}>
              Selected scenario · {selected.id}
            </Text>

            <Text style={styles.muted}>{selected.description}</Text>

            <View style={styles.divider} />

            <Metric
              label="Daily discharged energy"
              value={`${selected.dailyEnergy.toFixed(2)} kWh`}
            />

            <Metric
              label="Annual discharged energy"
              value={`${selected.annualEnergy.toFixed(2)} kWh`}
            />

            <Metric
              label="Annual charging energy"
              value={`${selected.annualCharge.toFixed(2)} kWh`}
            />

            <Metric
              label="Annual prosumer cost"
              value={fmt(selected.ownerTotal)}
            />

            <Metric
              label="Annual utility cost"
              value={fmt(selected.utilityTotal)}
            />

            <Metric
              label="Prosumer BEP"
              value={`Rs. ${selected.prosumerBEP.toFixed(2)}/kWh`}
              color={C.teal}
            />

            <Metric
              label="Utility BEP"
              value={`Rs. ${selected.utilityBEP.toFixed(2)}/kWh`}
              color={C.blue}
            />

            <Metric
              label="BEP difference"
              value={`Rs. ${selected.gap.toFixed(2)}/kWh`}
            />
          </Card>
        )}

        <Card>
          <Text style={styles.cardTitle}>Recommendation indicator</Text>

          <Text style={styles.bodyText}>
            {best.viable
              ? `${best.id} has the highest calculated BEP gap, and its utility BEP is higher than its prosumer BEP under the current inputs.`
              : `${best.id} has the highest calculated BEP gap, but its utility BEP is not higher than its prosumer BEP under the current inputs.`}
          </Text>

          <Text style={styles.muted}>
            A high BEP gap alone does not prove feasibility.
            Technical constraints, customer behaviour, tariffs
            and validated costs must also be considered.
          </Text>
        </Card>

        <Button
          title="Edit parameters and calculate again"
          onPress={() => setScreen("inputs")}
        />
      </>
    );
  };

  /* =========================
     PROFILE SCREEN
  ========================= */

  const renderProfile = () => (
    <>
      {renderHeader()}

      <Heading
        title="My Profile"
        subtitle="Account information."
      />

      <Card>
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={styles.profileLarge}
          />
        ) : (
          <View style={styles.profileLargePlaceholder}>
            <Text style={styles.profileLargeInitial}>
              {initials.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={styles.profileName}>{fullName}</Text>
        <Text style={styles.profileEmail}>{initials}</Text>
        <Text style={styles.profileEmail}>{email}</Text>
        <Text style={styles.profileEmail}>{mobile}</Text>

        <View style={styles.divider} />

        <Metric label="Account type" value={role} />

        <Button
          title="Change profile picture"
          secondary
          onPress={choosePhoto}
        />

        <Button
          title="Sign out"
          secondary
          onPress={signOut}
        />
      </Card>
    </>
  );

  /* =========================
     MAIN NAVIGATION
  ========================= */

  const renderMain = () => {
    if (screen === "welcome") return renderWelcome();
    if (screen === "login") return renderLogin();
    if (screen === "register") return renderRegister();

    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            showsVerticalScrollIndicator={false}
          >
            {screen === "dashboard" && renderDashboard()}
            {screen === "inputs" && renderInputs()}
            {screen === "scenarios" && renderScenarios()}
            {screen === "results" && renderResults()}
            {screen === "profile" && renderProfile()}
          </ScrollView>

          <View style={styles.bottomNav}>
            {[
              ["Home", "dashboard", "⌂"],
              ["Inputs", "inputs", "⚙"],
              ["Scenarios", "scenarios", "◈"],
              ["Results", "results", "▥"],
              ["Profile", "profile", "○"],
            ].map(([label, target, icon]) => (
              <TouchableOpacity
                key={target}
                style={styles.navItem}
                onPress={() => {
                  setError("");
                  setScreen(target);
                }}
              >
                <Text
                  style={[
                    styles.navIcon,
                    screen === target && styles.navActive,
                  ]}
                >
                  {icon}
                </Text>

                <Text
                  style={[
                    styles.navLabel,
                    screen === target && styles.navActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  };

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={C.bg}
      />
      {renderMain()}
    </>
  );
}

/* =========================
   ALL STYLES
========================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },

  scroll: {
    flex: 1,
  },

  content: {
    padding: 18,
    paddingBottom: 30,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  brand: {
    color: C.teal,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
  },

  headerSub: {
    color: C.muted,
    fontSize: 9,
    marginTop: 5,
    letterSpacing: 1,
  },

  roleBadge: {
    backgroundColor: "#153B3A",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  roleBadgeText: {
    color: C.teal,
    fontSize: 9,
    fontWeight: "900",
  },

  headingBlock: {
    marginBottom: 17,
  },

  heading: {
    color: C.text,
    fontSize: 25,
    fontWeight: "900",
    marginBottom: 5,
  },

  muted: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
  },

  mutedCenter: {
    color: C.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
  },

  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 17,
    marginBottom: 15,
  },

  cardTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 15,
  },

  button: {
    minHeight: 50,
    backgroundColor: C.teal,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
    marginTop: 15,
  },

  buttonText: {
    color: "#07131A",
    fontSize: 13,
    fontWeight: "900",
  },

  buttonSecondary: {
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
  },

  buttonSecondaryText: {
    color: C.text,
  },

  /* Welcome screen */

  welcomeContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 21,
    paddingTop: 35,
    paddingBottom: 30,
  },

  welcomeLogo: {
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: "#153B3A",
    borderWidth: 1,
    borderColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 25,
    position: "relative",
  },

  welcomeLogoText: {
    color: C.teal,
    fontSize: 39,
    fontWeight: "900",
  },

  logoDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.orange,
    right: 17,
    top: 17,
  },

  welcomeSmall: {
    color: C.teal,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2.5,
    textAlign: "center",
    marginBottom: 13,
  },

  welcomeMainTitle: {
    color: C.text,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },

  welcomeAppTitle: {
    color: C.teal,
    fontSize: 31,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 5,
  },

  welcomeDescription: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 15,
    marginBottom: 25,
  },

  welcomeFeatures: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    gap: 8,
  },

  welcomeFeature: {
    flex: 1,
    minHeight: 115,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },

  welcomeFeatureIcon: {
    color: C.teal,
    fontSize: 22,
    marginBottom: 8,
  },

  welcomeFeatureTitle: {
    color: C.text,
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
  },

  welcomeFeatureText: {
    color: C.muted,
    fontSize: 9,
    marginTop: 5,
    textAlign: "center",
  },

  welcomeActions: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 21,
    padding: 18,
  },

  welcomeActionTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: "900",
  },

  welcomeActionSubtitle: {
    color: C.muted,
    fontSize: 11,
    marginTop: 5,
    lineHeight: 18,
  },

  /* Login and registration */

  loginContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 19,
    paddingBottom: 30,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 10,
  },

  backButtonText: {
    color: C.teal,
    fontSize: 14,
    fontWeight: "800",
  },

  loginLogo: {
    width: 75,
    height: 75,
    borderRadius: 24,
    backgroundColor: "#153B3A",
    borderWidth: 1,
    borderColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 18,
  },

  loginLogoText: {
    color: C.teal,
    fontSize: 29,
    fontWeight: "900",
  },

  loginTitle: {
    color: C.text,
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
  },

  loginSubtitle: {
    color: C.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 19,
  },

  loginFooter: {
    color: C.muted,
    textAlign: "center",
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 18,
  },

  photoPicker: {
    alignSelf: "center",
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    borderColor: C.teal,
    backgroundColor: "#152638",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginVertical: 15,
  },

  photoPlaceholder: {
    alignItems: "center",
  },

  photoIcon: {
    color: C.teal,
    fontSize: 29,
  },

  photoText: {
    color: C.muted,
    fontSize: 9,
    marginTop: 5,
  },

  profileImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },

  profileLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
    marginBottom: 14,
  },

  profileLargePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#153B3A",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
  },

  profileLargeInitial: {
    color: C.teal,
    fontSize: 35,
    fontWeight: "900",
  },

  field: {
    marginTop: 15,
  },

  fieldLabel: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 7,
  },

  inputWrap: {
    minHeight: 49,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  input: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    paddingVertical: 10,
  },

  suffix: {
    color: C.muted,
    fontSize: 10,
    marginLeft: 8,
  },

  passwordRow: {
    minHeight: 49,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  passwordInput: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    paddingVertical: 10,
  },

  showPassword: {
    color: C.teal,
    fontSize: 10,
    fontWeight: "900",
    padding: 8,
  },

  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 15,
    padding: 13,
    marginTop: 11,
  },

  roleCardActive: {
    borderColor: C.teal,
    backgroundColor: "#123432",
  },

  roleCardIcon: {
    fontSize: 25,
    marginRight: 12,
  },

  roleCardTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: "900",
  },

  roleCardDescription: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 4,
  },

  radioText: {
    color: C.teal,
    fontSize: 19,
    marginLeft: 8,
  },

  error: {
    color: C.red,
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
  },

  /* Dashboard */

  welcomeBanner: {
    backgroundColor: "#102B32",
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#28665D",
    padding: 19,
    marginBottom: 25,
  },

  eyebrow: {
    color: C.teal,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
  },

  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  welcomeTitle: {
    color: C.text,
    fontSize: 25,
    fontWeight: "900",
  },

  welcomeDescription: {
    color: "#A8C3C5",
    fontSize: 11,
    lineHeight: 18,
    marginTop: 7,
  },

  smallProfile: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#1A4947",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  smallProfileText: {
    color: C.teal,
    fontSize: 22,
    fontWeight: "900",
  },

  smallProfileImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginLeft: 10,
  },

  bannerFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#315253",
    paddingTop: 13,
    marginTop: 18,
  },

  bannerCaption: {
    color: "#A8C3C5",
    fontSize: 9,
    fontWeight: "800",
  },

  readyCaption: {
    color: C.teal,
    fontSize: 9,
    fontWeight: "900",
  },

  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  overviewCard: {
    width: "48%",
    minHeight: 130,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    padding: 14,
    marginBottom: 12,
    justifyContent: "center",
  },

  overviewIcon: {
    fontSize: 21,
    marginBottom: 9,
  },

  overviewLabel: {
    color: C.muted,
    fontSize: 10,
    marginBottom: 7,
  },

  overviewValue: {
    color: C.text,
    fontSize: 20,
    fontWeight: "900",
  },

  featurePillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 13,
  },

  featurePill: {
    overflow: "hidden",
    backgroundColor: "#173D36",
    color: C.teal,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    fontSize: 9,
    fontWeight: "800",
  },

  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },

  actionIcon: {
    color: C.teal,
    fontSize: 22,
    width: 43,
    height: 43,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: "#183A3A",
    borderRadius: 13,
    overflow: "hidden",
    marginRight: 12,
  },

  actionTitle: {
    color: C.text,
    fontSize: 12,
    fontWeight: "800",
  },

  actionSubtitle: {
    color: C.muted,
    fontSize: 10,
    marginTop: 5,
  },

  arrow: {
    color: C.teal,
    fontSize: 25,
    marginLeft: 8,
  },

  utilityCard: {
    borderColor: "#4C4272",
  },

  utilityHeading: {
    color: C.purple,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 13,
  },

  analysisPanel: {
    backgroundColor: "#102B32",
    borderWidth: 1,
    borderColor: "#28665D",
    borderRadius: 19,
    padding: 17,
    marginBottom: 20,
  },

  /* Scenarios and results */

  scenarioTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  scenarioId: {
    color: C.teal,
    fontSize: 14,
    fontWeight: "900",
  },

  scenarioType: {
    color: C.blue,
    backgroundColor: "#172D45",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    fontSize: 10,
    fontWeight: "900",
  },

  bestCard: {
    backgroundColor: "#111F2B",
    borderColor: "#28665D",
  },

  bestId: {
    color: C.teal,
    fontSize: 43,
    fontWeight: "900",
    marginTop: 12,
  },

  metricRow: {
    flexDirection: "row",
    gap: 8,
  },

  metric: {
    flex: 1,
    marginTop: 8,
  },

  metricLabel: {
    color: C.muted,
    fontSize: 9,
    marginBottom: 6,
  },

  metricValue: {
    fontSize: 12,
    fontWeight: "900",
  },

  legend: {
    flexDirection: "row",
    gap: 14,
    marginVertical: 10,
  },

  legendTeal: {
    color: C.teal,
    fontSize: 10,
  },

  legendBlue: {
    color: C.blue,
    fontSize: 10,
  },

  chart: {
    height: 155,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
  },

  barGroup: {
    flex: 1,
    alignItems: "center",
  },

  chartLabel: {
    color: C.text,
    fontSize: 10,
    marginBottom: 6,
  },

  barPair: {
    height: 125,
    flexDirection: "row",
    gap: 4,
    alignItems: "flex-end",
  },

  barTrack: {
    height: 125,
    justifyContent: "flex-end",
  },

  bar: {
    width: 12,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },

  chartNote: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 12,
  },

  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    borderRadius: 9,
  },

  resultSelected: {
    backgroundColor: "#173238",
  },

  resultId: {
    color: C.text,
    fontSize: 12,
    fontWeight: "800",
  },

  resultTeal: {
    color: C.teal,
    fontSize: 12,
    fontWeight: "900",
  },

  resultBlue: {
    color: C.blue,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
  },

  bodyText: {
    color: C.text,
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 10,
  },

  profileName: {
    color: C.text,
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
  },

  profileEmail: {
    color: C.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 5,
  },

  /* Bottom navigation */

  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#0D1522",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 9,
    paddingBottom: Platform.OS === "ios" ? 18 : 9,
  },

  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  navIcon: {
    color: C.muted,
    fontSize: 19,
    marginBottom: 3,
  },

  navLabel: {
    color: C.muted,
    fontSize: 9,
    fontWeight: "600",
  },

  navActive: {
    color: C.teal,
    fontWeight: "900",
  },
});
