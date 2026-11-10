
import React, {useEffect,useMemo,useState} from "react";
import {
  SafeAreaView,ScrollView,View,Text,TextInput,
  TouchableOpacity,StyleSheet,StatusBar,Platform
} from "react-native";

const ev0={
  battery:"50",daily:"20",days:"365",eff:"90",
  years:"5",discount:"10",escalation:"3",
  homePeak:"70",homeDay:"15",homeOff:"31",
  stationPeak:"111",stationDay:"87",stationOff:"53",
  export:"45.80",degradation:"10"
};

const util0={
  energyCost:"30.98",avoided:"115",
  pFixed:"",pVariable:"",uFixed:"",uVariable:""
};

const scenarios=[
  ["S1","V2G","Home → Home","Charge at home and discharge to the grid at home."],
  ["S2","V2G","Home → Station","Charge at home and discharge through a compatible station."],
  ["S3","V2G","Station → Home","Charge at a station and discharge at home."],
  ["S4","V2G","Station → Station","Charge and discharge through compatible station infrastructure."],
  ["S5","V2H","Station → Home","Charge at a station and supply household demand at home."],
  ["S6","V2H","Home → Home","Charge at home and supply household demand through a V2H unit."]
].map(([id,type,name,desc])=>({id,type,name,desc}));

const n=v=>Number(v)||0;
const rs=v=>"Rs. "+Number(v).toFixed(2);

function Field({
  label,value,onChange,unit,
  keyboardType="default",
  secureTextEntry=false,
  autoCapitalize="sentences"
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputrow}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          placeholder="Enter value"
          placeholderTextColor="#607487"
          selectionColor="#5CE6C3"
          style={s.input}
        />
        {unit?<Text style={s.unit}>{unit}</Text>:null}
      </View>
    </View>
  );
}

function Btn({title,onPress,secondary,disabled}) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled}
      style={[
        s.btn,
        secondary&&s.btn2,
        disabled&&s.btnDisabled
      ]}
    >
      <Text style={[
        s.btntext,
        secondary&&s.btntext2
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function Card({children,highlight}) {
  return (
    <View style={[
      s.card,
      highlight&&s.highlightCard
    ]}>
      {children}
    </View>
  );
}

function SectionTitle({children}) {
  return (
    <Text style={s.heading}>{children}</Text>
  );
}

export default function App() {
  const [role,setRole]=useState("");
  const [signed,setSigned]=useState(false);
  const [tab,setTab]=useState("Home");
  const [signup,setSignup]=useState(false);

  const [profile,setProfile]=useState({
    name:"",email:"",phone:"",organization:""
  });

  const [password,setPassword]=useState("");
  const [ev,setEv]=useState(ev0);
  const [u,setU]=useState(util0);
  const [slide,setSlide]=useState(0);
  const [busy,setBusy]=useState(false);
  const [results,setResults]=useState(null);

  useEffect(()=>{
    let t=setInterval(()=>setSlide(x=>(x+1)%6),10000);
    return ()=>clearInterval(t);
  },[]);

  const set=(setter,key,val)=>
    setter(o=>({...o,[key]:val}));

  const ranked=useMemo(()=>{
    let energy=n(ev.daily)*n(ev.days);
    let ready=energy>0&&
      n(u.pFixed)+n(u.pVariable)>0&&
      n(u.uFixed)+n(u.uVariable)>0;

    return scenarios.map((x,i)=>{
      let f=[1,.94,.91,.88,.82,.76][i];
      let annual=energy*f;

      let pb=ready?
        (n(u.pFixed)+n(u.pVariable)*f)/annual:null;

      let ub=ready?
        (n(u.uFixed)+n(u.uVariable)*f)/annual:null;

      let score=(
        x.type==="V2G"
          ?n(ev.export)-n(ev.degradation)
          :(n(ev.homePeak)+n(ev.stationPeak))/2-n(ev.degradation)
      )*f;

      return {
        ...x,annual,pb,ub,
        gap:ready?ub-pb:null,
        score
      };
    }).sort((a,b)=>b.score-a.score);
  },[ev,u]);

  const find=()=>{
    setBusy(true);
    setResults(null);

    setTimeout(()=>{
      setResults(ranked);
      setBusy(false);
      setTab("Results");
    },1200);
  };

  const field=(label,key,unit,source="ev")=>(
    <Field
      label={label}
      value={(source==="ev"?ev:u)[key]}
      onChange={v=>set(source==="ev"?setEv:setU,key,v)}
      unit={unit}
      keyboardType="decimal-pad"
    />
  );

  const nav=[
    "Home",
    "Profile",
    role==="Customer"?"EV Details":"Utility",
    "Results"
  ];

  const navIcons={
    Home:"⌂",
    Profile:"◉",
    "EV Details":"ϟ",
    Utility:"▦",
    Results:"▤"
  };

  if(!signed) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#070B13"/>

        <ScrollView
          contentContainerStyle={s.login}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.logoCircle}>
            <Text style={s.bolt}>ϟ</Text>
          </View>

          <Text style={s.brand}>EV ENERGY</Text>
          <Text style={s.greenbrand}>ADVISOR</Text>

          <Text style={s.sub}>
            Smarter V2G and V2H decisions
          </Text>

          <Card>
            <Text style={s.heading}>
              {signup?"Create account":"Welcome back"}
            </Text>

            <Text style={s.label}>ACCOUNT TYPE</Text>

            <View style={s.roles}>
              {["Customer","Utility Officer"].map(x=>(
                <TouchableOpacity
                  activeOpacity={0.75}
                  key={x}
                  onPress={()=>setRole(x)}
                  style={[
                    s.role,
                    role===x&&s.selected
                  ]}
                >
                  <Text style={[
                    s.roleText,
                    role===x&&s.roleTextActive
                  ]}>
                    {x}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Field
              label="Full name"
              value={profile.name}
              onChange={v=>set(setProfile,"name",v)}
              autoCapitalize="words"
            />

            <Field
              label="Email address"
              value={profile.email}
              onChange={v=>set(setProfile,"email",v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              secureTextEntry={true}
              autoCapitalize="none"
            />

            <Btn
              title={signup?"Create account  →":"Sign in  →"}
              onPress={()=>{
                if(role){
                  setSigned(true);
                  setTab("Home");
                }
              }}
            />

            <Btn
              title={signup?"Back to sign in":"Create a new account"}
              secondary
              onPress={()=>setSignup(!signup)}
            />

            <Text style={s.note}>
              Prototype sign-in only. Secure authentication and cloud account storage must be connected before public deployment.
            </Text>
          </Card>

          <Text style={s.footer}>
            POWERING A SMARTER ENERGY FUTURE
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#070B13"/>

      <View style={s.top}>
        <View>
          <Text style={s.topbrand}>
            EV <Text style={s.topbrandGreen}>ENERGY</Text>
          </Text>
          <Text style={s.workspace}>{role} workspace</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          style={s.signout}
          onPress={()=>{
            setSigned(false);
            setRole("");
          }}
        >
          <Text style={s.signoutText}>↗ Sign out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {tab==="Home"&&<>
          <View style={s.hero}>
            <View style={s.heroTag}>
              <View style={s.liveDot}/>
              <Text style={s.heroTagText}>
                ENERGY INTELLIGENCE PLATFORM
              </Text>
            </View>

            <Text style={s.herotitle}>
              Make every{"\n"}
              <Text style={s.heroAccent}>kilowatt count.</Text>
            </Text>

            <Text style={s.herotext}>
              Compare six V2G and V2H pathways using your EV, tariff and cost assumptions.
            </Text>

            <View style={s.heroBottom}>
              <Text style={s.heroBottomText}>SMART ENERGY ANALYSIS</Text>
              <Text style={s.heroSymbol}>ϟ</Text>
            </View>
          </View>

          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>EXPLORE</Text>
            <Text style={s.sectionHint}>01 / 06</Text>
          </View>

          <Card highlight>
            <View style={s.rowBetween}>
              <Text style={s.green}>
                {scenarios[slide].id}  ·  {scenarios[slide].type}
              </Text>
              <View style={s.scenarioBadge}>
                <Text style={s.scenarioBadgeText}>SCENARIO</Text>
              </View>
            </View>

            <Text style={s.scenario}>
              {scenarios[slide].name}
            </Text>

            <Text style={s.herotext}>
              {scenarios[slide].desc}
            </Text>

            <View style={s.dots}>
              {scenarios.map((x,i)=>(
                <TouchableOpacity
                  key={x.id}
                  onPress={()=>setSlide(i)}
                  style={[
                    s.dot,
                    i===slide&&s.doton
                  ]}
                />
              ))}
            </View>
          </Card>

          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>YOUR ENERGY SNAPSHOT</Text>
            <Text style={s.sectionHint}>CURRENT INPUTS</Text>
          </View>

          <View style={s.twocol}>
            <Card>
              <Text style={s.statIcon}>▣</Text>
              <Text style={s.note}>BATTERY CAPACITY</Text>
              <Text style={s.stat}>{ev.battery}</Text>
              <Text style={s.statUnit}>kWh</Text>
            </Card>

            <Card>
              <Text style={s.statIcon}>ϟ</Text>
              <Text style={s.note}>DAILY ENERGY</Text>
              <Text style={s.stat}>{ev.daily}</Text>
              <Text style={s.statUnit}>kWh / day</Text>
            </Card>
          </View>

          <View style={s.analysisCard}>
            <Text style={s.analysisEyebrow}>READY TO ANALYSE?</Text>
            <Text style={s.analysisTitle}>
              Discover your best energy pathway.
            </Text>
            <Text style={s.herotext}>
              Evaluate all six scenarios with your current assumptions.
            </Text>

            <Btn
              title={busy?"Analysing scenarios…":"Find Best Scenario  →"}
              onPress={find}
              disabled={busy}
            />
          </View>

          <Text style={s.note}>
            Complete your EV and cost assumptions before analysis.
          </Text>
        </>}

        {tab==="Profile"&&<>
          <Text style={s.title}>Your profile</Text>
          <Text style={s.pageSubtitle}>
            Manage your personal and account information.
          </Text>

          <Card>
            <SectionTitle>Personal information</SectionTitle>

            <Field
              label="Full name"
              value={profile.name}
              onChange={v=>set(setProfile,"name",v)}
              autoCapitalize="words"
            />

            <Field
              label="Email address"
              value={profile.email}
              onChange={v=>set(setProfile,"email",v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Field
              label="Phone number"
              value={profile.phone}
              onChange={v=>set(setProfile,"phone",v)}
              keyboardType="phone-pad"
            />

            {role==="Utility Officer"&&
              <Field
                label="Organization"
                value={profile.organization}
                onChange={v=>set(setProfile,"organization",v)}
                autoCapitalize="words"
              />
            }
          </Card>
        </>}

        {tab==="EV Details"&&<>
          <Text style={s.title}>EV & tariffs</Text>
          <Text style={s.pageSubtitle}>
            Configure vehicle, operating and tariff assumptions.
          </Text>

          <Card>
            <SectionTitle>Vehicle & operation</SectionTitle>
            {field("Battery capacity","battery","kWh")}
            {field("Daily discharged energy","daily","kWh/day")}
            {field("Operating days","days","days/year")}
            {field("Round-trip efficiency","eff","%")}
          </Card>

          <Card>
            <SectionTitle>Financial assumptions</SectionTitle>
            {field("Analysis period","years","years")}
            {field("Discount rate","discount","%")}
            {field("Annual escalation","escalation","%")}
            {field("V2G export value","export","Rs./kWh")}
            {field("Battery degradation","degradation","Rs./kWh")}
          </Card>

          <Card>
            <SectionTitle>Home TOU tariff</SectionTitle>
            {field("Peak","homePeak","Rs./kWh")}
            {field("Day","homeDay","Rs./kWh")}
            {field("Off-peak","homeOff","Rs./kWh")}
          </Card>

          <Card>
            <SectionTitle>Station retail tariff</SectionTitle>
            {field("Peak","stationPeak","Rs./kWh")}
            {field("Day","stationDay","Rs./kWh")}
            {field("Off-peak","stationOff","Rs./kWh")}
          </Card>

          <Btn
            title="Save EV details  ✓"
            onPress={()=>setTab("Home")}
          />
        </>}

        {tab==="Utility"&&<>
          <Text style={s.title}>Utility settings</Text>
          <Text style={s.pageSubtitle}>
            Configure the economic assumptions for your analysis.
          </Text>

          <Card>
            <SectionTitle>Utility assumptions</SectionTitle>
            {field("Utility energy-cost proxy","energyCost","Rs./kWh","u")}
            {field("Avoided peak-system value","avoided","Rs./kWh","u")}
          </Card>

          <Card>
            <SectionTitle>Annual costs for BEP</SectionTitle>

            {field("Prosumer annual fixed cost","pFixed","Rs./year","u")}
            {field("Prosumer annual variable cost","pVariable","Rs./year","u")}
            {field("Utility annual fixed cost","uFixed","Rs./year","u")}
            {field("Utility annual variable cost","uVariable","Rs./year","u")}

            <Text style={s.note}>
              Use approved annual cost inputs from your research workbook. BEPs are not calculated until these are entered.
            </Text>
          </Card>

          <Btn
            title="Save utility settings  ✓"
            onPress={()=>setTab("Home")}
          />
        </>}

        {tab==="Results"&&<>
          <Text style={s.title}>Analysis results</Text>
          <Text style={s.pageSubtitle}>
            Compare the six V2G and V2H scenarios.
          </Text>

          {!results?
            <Card>
              <Text style={s.emptyIcon}>ϟ</Text>
              <Text style={s.scenario}>No analysis yet</Text>
              <Text style={s.herotext}>
                Run an analysis to see your scenario comparison.
              </Text>
              <Btn
                title="Find Best Scenario  →"
                onPress={find}
              />
            </Card>
          :
            <>
              <Card highlight>
                <Text style={s.green}>
                  ★  TOP MATCH · INDICATIVE RANKING
                </Text>

                <Text style={s.herotitle}>
                  {results[0].id} · {results[0].type}
                </Text>

                <Text style={s.scenario}>
                  {results[0].name}
                </Text>

                <Text style={s.herotext}>
                  {results[0].desc}
                </Text>
              </Card>

              <Text style={s.sectionLabel}>
                SCENARIO COMPARISON
              </Text>

              {results.map((r,i)=>(
                <Card key={r.id}>
                  <View style={s.rowBetween}>
                    <Text style={s.green}>
                      {r.id} · {r.type}
                    </Text>
                    <Text style={s.rank}>
                      RANK #{i+1}
                    </Text>
                  </View>

                  <Text style={s.scenario}>{r.name}</Text>

                  <Text style={s.herotext}>
                    Annual discharged energy: {r.annual.toFixed(2)} kWh
                  </Text>

                  {r.pb===null?
                    <Text style={s.warning}>
                      Enter all four annual cost inputs in Utility to calculate BEPs and BEP gap.
                    </Text>
                  :
                    <View style={s.resultValues}>
                      <View style={s.resultLine}>
                        <Text style={s.resultLabel}>Prosumer BEP</Text>
                        <Text style={s.resultValue}>{rs(r.pb)}/kWh</Text>
                      </View>

                      <View style={s.resultLine}>
                        <Text style={s.resultLabel}>Utility BEP</Text>
                        <Text style={s.resultValue}>{rs(r.ub)}/kWh</Text>
                      </View>

                      <View style={s.resultDivider}/>

                      <View style={s.resultLine}>
                        <Text style={s.green}>BEP gap</Text>
                        <Text style={s.resultGreen}>{rs(r.gap)}/kWh</Text>
                      </View>
                    </View>
                  }
                </Card>
              ))}

              <Text style={s.note}>
                Prototype ranking is indicative only. The scenario-specific formulas and cash flows must be validated against the approved research workbook before official use.
              </Text>

              <Btn
                title="↻  Run analysis again"
                onPress={find}
              />
            </>
          }
        </>}
      </ScrollView>

      <View style={s.nav}>
        {nav.map(x=>(
          <TouchableOpacity
            activeOpacity={0.7}
            key={x}
            onPress={()=>setTab(x)}
            style={[
              s.navItem,
              tab===x&&s.navItemActive
            ]}
          >
            <Text style={[
              s.navIcon,
              tab===x&&s.navIconActive
            ]}>
              {navIcons[x]}
            </Text>

            <Text style={[
              s.navtext,
              tab===x&&s.navtextActive
            ]}>
              {x}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  safe:{
    flex:1,
    backgroundColor:"#070B13"
  },

  login:{
    flexGrow:1,
    justifyContent:"center",
    padding:22,
    paddingTop:35,
    paddingBottom:35
  },

  logoCircle:{
    width:76,
    height:76,
    borderRadius:26,
    backgroundColor:"#123A38",
    borderWidth:1,
    borderColor:"#2B7166",
    alignSelf:"center",
    alignItems:"center",
    justifyContent:"center",
    marginBottom:17
  },

  bolt:{
    fontSize:46,
    fontWeight:"900",
    color:"#5CE6C3"
  },

  brand:{
    fontSize:27,
    fontWeight:"900",
    letterSpacing:3,
    color:"#F4F8FC",
    textAlign:"center"
  },

  greenbrand:{
    fontSize:27,
    fontWeight:"900",
    letterSpacing:3,
    color:"#5CE6C3",
    textAlign:"center"
  },

  sub:{
    color:"#91A4B8",
    textAlign:"center",
    marginTop:12,
    marginBottom:28,
    fontSize:13
  },

  top:{
    backgroundColor:"#0B111D",
    paddingHorizontal:19,
    paddingVertical:15,
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"center",
    borderBottomWidth:1,
    borderColor:"#1C2B3C"
  },

  topbrand:{
    fontSize:19,
    fontWeight:"900",
    letterSpacing:1,
    color:"#F3F8FC"
  },

  topbrandGreen:{
    color:"#5CE6C3"
  },

  workspace:{
    color:"#8296AA",
    fontSize:10,
    marginTop:4
  },

  signout:{
    backgroundColor:"#172534",
    borderWidth:1,
    borderColor:"#304254",
    borderRadius:12,
    paddingHorizontal:13,
    paddingVertical:9
  },

  signoutText:{
    color:"#D7E5EF",
    fontWeight:"700",
    fontSize:11
  },

  content:{
    padding:17,
    paddingBottom:35
  },

  hero:{
    backgroundColor:"#102D32",
    borderRadius:25,
    borderWidth:1,
    borderColor:"#23544F",
    padding:23,
    marginBottom:25,
    overflow:"hidden"
  },

  heroTag:{
    flexDirection:"row",
    alignItems:"center",
    gap:8
  },

  liveDot:{
    width:7,
    height:7,
    borderRadius:5,
    backgroundColor:"#5CE6C3"
  },

  heroTagText:{
    color:"#83DCC8",
    fontSize:9,
    fontWeight:"900",
    letterSpacing:1.3
  },

  herotitle:{
    fontSize:34,
    fontWeight:"900",
    color:"#F4FAF8",
    marginTop:22,
    lineHeight:40
  },

  heroAccent:{
    color:"#5CE6C3"
  },

  herotext:{
    color:"#A9BFBD",
    fontSize:12,
    lineHeight:20,
    marginTop:9
  },

  heroBottom:{
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"space-between",
    borderTopWidth:1,
    borderColor:"#2B5553",
    marginTop:22,
    paddingTop:14
  },

  heroBottomText:{
    color:"#83B7AE",
    fontSize:9,
    letterSpacing:1,
    fontWeight:"800"
  },

  heroSymbol:{
    color:"#5CE6C3",
    fontSize:28,
    fontWeight:"900"
  },

  sectionHeader:{
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"center",
    marginBottom:12,
    marginTop:5
  },

  sectionLabel:{
    color:"#8DA3B7",
    fontSize:10,
    fontWeight:"900",
    letterSpacing:1.2,
    marginBottom:10
  },

  sectionHint:{
    color:"#526A80",
    fontSize:9,
    fontWeight:"800"
  },

  heading:{
    fontSize:17,
    fontWeight:"800",
    color:"#F4F8FC",
    marginBottom:17
  },

  title:{
    fontSize:29,
    fontWeight:"900",
    color:"#F4F8FC",
    marginTop:12,
    marginBottom:5
  },

  pageSubtitle:{
    color:"#91A4B8",
    fontSize:12,
    lineHeight:19,
    marginBottom:20
  },

  card:{
    backgroundColor:"#101B2A",
    borderColor:"#26384B",
    borderWidth:1,
    borderRadius:20,
    padding:17,
    marginBottom:13
  },

  highlightCard:{
    backgroundColor:"#102C2D",
    borderColor:"#28665B"
  },

  rowBetween:{
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"space-between"
  },

  scenarioBadge:{
    backgroundColor:"#1B4843",
    borderRadius:7,
    paddingHorizontal:9,
    paddingVertical:5
  },

  scenarioBadgeText:{
    color:"#80DCC6",
    fontSize:8,
    fontWeight:"900",
    letterSpacing:1
  },

  scenario:{
    fontSize:21,
    fontWeight:"900",
    color:"#F2F7FC",
    marginTop:11
  },

  green:{
    color:"#5CE6C3",
    fontWeight:"900",
    fontSize:12
  },

  note:{
    fontSize:10,
    color:"#8296AA",
    lineHeight:16,
    marginTop:9
  },

  field:{
    marginBottom:16
  },

  label:{
    color:"#A9B9C9",
    fontSize:11,
    fontWeight:"700",
    marginBottom:8
  },

  inputrow:{
    backgroundColor:"#0A1320",
    borderWidth:1,
    borderColor:"#2B4054",
    borderRadius:13,
    paddingHorizontal:13,
    flexDirection:"row",
    alignItems:"center"
  },

  input:{
    color:"#F3F7FC",
    paddingVertical:13,
    flex:1,
    fontSize:14
  },

  unit:{
    color:"#5CE6C3",
    fontSize:10,
    fontWeight:"800",
    marginLeft:7
  },

  btn:{
    backgroundColor:"#5CE6C3",
    paddingVertical:16,
    paddingHorizontal:17,
    borderRadius:15,
    alignItems:"center",
    justifyContent:"center",
    marginTop:12,
    shadowColor:"#42D9B4",
    shadowOffset:{width:0,height:5},
    shadowOpacity:0.19,
    shadowRadius:12,
    elevation:4
  },

  btn2:{
    backgroundColor:"#172638",
    borderWidth:1,
    borderColor:"#344A60",
    shadowOpacity:0,
    elevation:0
  },

  btnDisabled:{
    opacity:0.6
  },

  btntext:{
    color:"#071A19",
    fontWeight:"900",
    fontSize:13,
    letterSpacing:0.2
  },

  btntext2:{
    color:"#DCE8F2"
  },

  roles:{
    flexDirection:"row",
    gap:9,
    marginTop:9,
    marginBottom:19
  },

  role:{
    flex:1,
    paddingVertical:14,
    paddingHorizontal:7,
    borderWidth:1,
    borderColor:"#2C4053",
    borderRadius:13,
    alignItems:"center",
    backgroundColor:"#0B1522"
  },

  roleText:{
    color:"#A8B9C9",
    fontSize:11,
    fontWeight:"700"
  },

  selected:{
    borderColor:"#5CE6C3",
    backgroundColor:"#123A36"
  },

  roleTextActive:{
    color:"#5CE6C3"
  },

  stat:{
    fontSize:26,
    fontWeight:"900",
    color:"#F4F8FC",
    marginTop:9
  },

  statIcon:{
    fontSize:21,
    color:"#5CE6C3",
    marginBottom:12
  },

  statUnit:{
    color:"#8296AA",
    fontSize:10,
    marginTop:2
  },

  twocol:{
    flexDirection:"row",
    gap:11,
    marginBottom:12
  },

  dots:{
    flexDirection:"row",
    gap:7,
    marginTop:19
  },

  dot:{
    width:7,
    height:7,
    borderRadius:8,
    backgroundColor:"#506B70"
  },

  doton:{
    width:25,
    backgroundColor:"#5CE6C3"
  },

  analysisCard:{
    backgroundColor:"#111E2D",
    borderWidth:1,
    borderColor:"#2B4054",
    borderRadius:21,
    padding:19,
    marginTop:5
  },

  analysisEyebrow:{
    color:"#5CE6C3",
    fontSize:9,
    fontWeight:"900",
    letterSpacing:1.3
  },

  analysisTitle:{
    color:"#F4F8FC",
    fontSize:21,
    fontWeight:"900",
    lineHeight:28,
    marginTop:10
  },

  footer:{
    textAlign:"center",
    color:"#506477",
    fontSize:9,
    letterSpacing:1.5,
    fontWeight:"800",
    marginTop:27
  },

  nav:{
    flexDirection:"row",
    justifyContent:"space-around",
    alignItems:"center",
    paddingTop:9,
    paddingBottom:Platform.OS==="ios"?18:10,
    paddingHorizontal:5,
    backgroundColor:"#0B111D",
    borderTopWidth:1,
    borderColor:"#253548"
  },

  navItem:{
    minWidth:66,
    alignItems:"center",
    justifyContent:"center",
    paddingVertical:7,
    paddingHorizontal:9,
    borderRadius:13
  },

  navItemActive:{
    backgroundColor:"#153832"
  },

  navIcon:{
    color:"#8195A9",
    fontSize:20,
    fontWeight:"800",
    marginBottom:3
  },

  navIconActive:{
    color:"#5CE6C3"
  },

  navtext:{
    color:"#8195A9",
    fontSize:9,
    fontWeight:"700"
  },

  navtextActive:{
    color:"#5CE6C3"
  },

  warning:{
    color:"#F3C978",
    fontSize:11,
    lineHeight:18,
    marginTop:12
  },

  emptyIcon:{
    fontSize:38,
    color:"#5CE6C3",
    fontWeight:"900"
  },

  rank:{
    color:"#8195A9",
    fontSize:9,
    fontWeight:"800"
  },

  resultValues:{
    backgroundColor:"#0A1521",
    borderRadius:13,
    padding:13,
    marginTop:14
  },

  resultLine:{
    flexDirection:"row",
    justifyContent:"space-between",
    alignItems:"center",
    paddingVertical:7
  },

  resultLabel:{
    color:"#A9B9C9",
    fontSize:11
  },

  resultValue:{
    color:"#F3F8FC",
    fontSize:12,
    fontWeight:"800"
  },

  resultDivider:{
    height:1,
    backgroundColor:"#293C4D",
    marginVertical:5
  },

  resultGreen:{
    color:"#5CE6C3",
    fontSize:13,
    fontWeight:"900"
  }
});
