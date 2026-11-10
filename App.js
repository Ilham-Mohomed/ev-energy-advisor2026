
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

// UPDATED FIELD COMPONENT
function Field({
  label,
  value,
  onChange,
  unit,
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
          style={s.input}
        />
        {unit?<Text style={s.unit}>{unit}</Text>:null}
      </View>
    </View>
  );
}

function Btn({title,onPress,secondary}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.btn,secondary&&s.btn2]}
    >
      <Text style={[s.btntext,secondary&&{color:"#DCE8F2"}]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function Card({children}) {
  return <View style={s.card}>{children}</View>;
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

  // NUMERICAL INPUT FIELDS
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

  if(!signed) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content"/>

        <ScrollView contentContainerStyle={s.login}>
          <Text style={s.bolt}>⚡</Text>
          <Text style={s.brand}>EV ENERGY</Text>
          <Text style={s.greenbrand}>ADVISOR</Text>
          <Text style={s.sub}>
            Smarter V2G and V2H decisions
          </Text>

          <Card>
            <Text style={s.heading}>
              {signup?"Create account":"Welcome back"}
            </Text>

            <Text style={s.label}>Account type</Text>

            <View style={s.roles}>
              {["Customer","Utility Officer"].map(x=>(
                <TouchableOpacity
                  key={x}
                  onPress={()=>setRole(x)}
                  style={[s.role,role===x&&s.selected]}
                >
                  <Text style={{
                    color:role===x?"#55E6B8":"#B7C5D3"
                  }}>
                    {x}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* TEXT INPUTS - KEYBOARD FIXED */}

            <Field
              label="Full name"
              value={profile.name}
              onChange={v=>set(setProfile,"name",v)}
              keyboardType="default"
              autoCapitalize="words"
            />

            <Field
              label="Email"
              value={profile.email}
              onChange={v=>set(setProfile,"email",v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              keyboardType="default"
              secureTextEntry={true}
              autoCapitalize="none"
            />

            <Btn
              title={signup?"Create account":"Sign in"}
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
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content"/>

      <View style={s.top}>
        <View>
          <Text style={s.topbrand}>
            EV <Text style={{color:"#4CE0B1"}}>ENERGY</Text>
          </Text>
          <Text style={s.note}>{role} workspace</Text>
        </View>

        <TouchableOpacity onPress={()=>{
          setSigned(false);
          setRole("");
        }}>
          <Text style={s.green}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>

        {tab==="Home"&&<>
          <View style={s.hero}>
            <Text style={s.green}>
              ENERGY INTELLIGENCE PLATFORM
            </Text>
            <Text style={s.herotitle}>
              Make every{"\n"}kilowatt count.
            </Text>
            <Text style={s.herotext}>
              Compare six V2G and V2H pathways using your EV, tariff and cost assumptions.
            </Text>
          </View>

          <Text style={s.heading}>
            Scenario spotlight · changes every 10 seconds
          </Text>

          <Card>
            <Text style={s.green}>
              {scenarios[slide].id} · {scenarios[slide].type}
            </Text>
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
                  style={[s.dot,i===slide&&s.doton]}
                />
              ))}
            </View>
          </Card>

          <View style={s.twocol}>
            <Card>
              <Text style={s.note}>BATTERY CAPACITY</Text>
              <Text style={s.stat}>{ev.battery} kWh</Text>
            </Card>

            <Card>
              <Text style={s.note}>DAILY ENERGY</Text>
              <Text style={s.stat}>{ev.daily} kWh</Text>
            </Card>
          </View>

          <Btn
            title={busy?"Analysing scenarios…":"Find Best Scenario →"}
            onPress={find}
          />

          <Text style={s.note}>
            Complete your EV and cost assumptions before analysis.
          </Text>
        </>}

        {tab==="Profile"&&<>
          <Text style={s.title}>Profile details</Text>

          <Card>
            <Text style={s.heading}>Personal information</Text>

            <Field
              label="Full name"
              value={profile.name}
              onChange={v=>set(setProfile,"name",v)}
              autoCapitalize="words"
            />

            <Field
              label="Email"
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
          <Text style={s.title}>EV & tariff details</Text>

          <Card>
            <Text style={s.heading}>Vehicle & operation</Text>
            {field("Battery capacity","battery","kWh")}
            {field("Daily discharged energy","daily","kWh/day")}
            {field("Operating days","days","days/year")}
            {field("Round-trip efficiency","eff","%")}
          </Card>

          <Card>
            <Text style={s.heading}>Financial assumptions</Text>
            {field("Analysis period","years","years")}
            {field("Discount rate","discount","%")}
            {field("Annual escalation","escalation","%")}
            {field("V2G export value","export","Rs./kWh")}
            {field("Battery degradation","degradation","Rs./kWh")}
          </Card>

          <Card>
            <Text style={s.heading}>Home TOU tariff</Text>
            {field("Peak","homePeak","Rs./kWh")}
            {field("Day","homeDay","Rs./kWh")}
            {field("Off-peak","homeOff","Rs./kWh")}
          </Card>

          <Card>
            <Text style={s.heading}>Station retail tariff</Text>
            {field("Peak","stationPeak","Rs./kWh")}
            {field("Day","stationDay","Rs./kWh")}
            {field("Off-peak","stationOff","Rs./kWh")}
          </Card>

          <Btn
            title="Save EV details"
            onPress={()=>setTab("Home")}
          />
        </>}

        {tab==="Utility"&&<>
          <Text style={s.title}>Utility configuration</Text>

          <Card>
            <Text style={s.heading}>Utility assumptions</Text>
            {field("Utility energy-cost proxy","energyCost","Rs./kWh","u")}
            {field("Avoided peak-system value","avoided","Rs./kWh","u")}
          </Card>

          <Card>
            <Text style={s.heading}>
              Annual costs required for BEP
            </Text>

            {field("Prosumer annual fixed cost","pFixed","Rs./year","u")}
            {field("Prosumer annual variable cost","pVariable","Rs./year","u")}
            {field("Utility annual fixed cost","uFixed","Rs./year","u")}
            {field("Utility annual variable cost","uVariable","Rs./year","u")}

            <Text style={s.note}>
              Use approved annual cost inputs from your research workbook. BEPs are not calculated until these are entered.
            </Text>
          </Card>

          <Btn
            title="Save utility settings"
            onPress={()=>setTab("Home")}
          />
        </>}

        {tab==="Results"&&<>
          <Text style={s.title}>Scenario analysis</Text>

          <Text style={s.herotext}>
            Ranked comparison using the currently entered assumptions.
          </Text>

          {!results?
            <Card>
              <Text style={s.herotext}>
                Run an analysis to see the results.
              </Text>
              <Btn
                title="Find Best Scenario"
                onPress={find}
              />
            </Card>
          :
            <>
              <Card>
                <Text style={s.green}>
                  TOP MATCH · INDICATIVE RANKING
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

              {results.map((r,i)=>(
                <Card key={r.id}>
                  <Text style={s.green}>
                    {i+1}. {r.id} · {r.type}
                  </Text>

                  <Text style={s.scenario}>{r.name}</Text>

                  <Text style={s.herotext}>
                    Annual discharged energy: {r.annual.toFixed(2)} kWh
                  </Text>

                  {r.pb===null?
                    <Text style={s.warning}>
                      Enter all four annual cost inputs in Utility to calculate BEPs and BEP gap.
                    </Text>
                  :
                    <>
                      <Text style={s.herotext}>
                        Prosumer BEP: {rs(r.pb)}/kWh
                      </Text>
                      <Text style={s.herotext}>
                        Utility BEP: {rs(r.ub)}/kWh
                      </Text>
                      <Text style={s.green}>
                        BEP gap: {rs(r.gap)}/kWh
                      </Text>
                    </>
                  }
                </Card>
              ))}

              <Text style={s.note}>
                Prototype ranking is indicative only. The scenario-specific formulas and cash flows must be validated against the approved research workbook before official use.
              </Text>

              <Btn
                title="Run analysis again"
                onPress={find}
              />
            </>
          }
        </>}
      </ScrollView>

      <View style={s.nav}>
        {nav.map(x=>(
          <TouchableOpacity
            key={x}
            onPress={()=>setTab(x)}
          >
            <Text style={[
              s.navtext,
              tab===x&&s.green
            ]}>
              {({Home:"⌂",Profile:"◉","EV Details":"⚡",Utility:"▦",Results:"▤"})[x]}
              {"\n"}
              {x}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:"#071321"},
  login:{flexGrow:1,justifyContent:"center",padding:22},
  bolt:{fontSize:42,textAlign:"center",color:"#52E2B4"},
  brand:{fontSize:27,fontWeight:"900",letterSpacing:3,color:"#F4F8FC",textAlign:"center"},
  greenbrand:{fontSize:27,fontWeight:"900",letterSpacing:3,color:"#4CE0B1",textAlign:"center"},
  sub:{color:"#9DB0C3",textAlign:"center",margin:14,marginBottom:25},
  top:{backgroundColor:"#0B1B2B",padding:15,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  topbrand:{fontSize:18,fontWeight:"900",color:"#F3F8FC"},
  content:{padding:16,paddingBottom:30},
  hero:{backgroundColor:"#10413C",borderRadius:22,padding:22,marginBottom:18},
  herotitle:{fontSize:32,fontWeight:"900",color:"#F4FAF8",marginTop:10},
  herotext:{color:"#B5C9C8",fontSize:12,lineHeight:19,marginTop:8},
  heading:{fontSize:16,fontWeight:"800",color:"#F4F8FC",marginBottom:12},
  title:{fontSize:27,fontWeight:"900",color:"#F4F8FC",marginVertical:12},
  card:{backgroundColor:"#102337",borderColor:"#233C52",borderWidth:1,borderRadius:16,padding:16,marginBottom:12},
  best:{backgroundColor:"#10413C",borderColor:"#26765F"},
  scenario:{fontSize:21,fontWeight:"900",color:"#F2F7FC",marginTop:10},
  green:{color:"#54E1B4",fontWeight:"900"},
  note:{fontSize:10,color:"#8195A9",lineHeight:16,marginTop:8},
  field:{marginBottom:13},
  label:{color:"#A8B9C9",fontSize:12,marginBottom:6},
  inputrow:{backgroundColor:"#091A2A",borderWidth:1,borderColor:"#294156",borderRadius:10,paddingHorizontal:10,flexDirection:"row",alignItems:"center"},
  input:{color:"#F3F7FC",paddingVertical:11,flex:1},
  unit:{color:"#54DDB3",fontSize:10},
  btn:{backgroundColor:"#43D9A9",padding:15,borderRadius:12,alignItems:"center",marginTop:10},
  btn2:{backgroundColor:"#1A3045",borderWidth:1,borderColor:"#38536B"},
  btntext:{color:"#06251E",fontWeight:"900"},
  roles:{flexDirection:"row",gap:8,marginBottom:14},
  role:{flex:1,padding:12,borderWidth:1,borderColor:"#294156",borderRadius:10,alignItems:"center"},
  selected:{borderColor:"#43D9A9",backgroundColor:"#123B37"},
  stat:{fontSize:20,fontWeight:"900",color:"#F4F8FC",marginTop:6},
  twocol:{flexDirection:"row",gap:10},
  dots:{flexDirection:"row",gap:7,marginTop:17},
  dot:{width:7,height:7,borderRadius:8,backgroundColor:"#587083"},
  doton:{width:23,backgroundColor:"#4CE0B1"},
  nav:{flexDirection:"row",justifyContent:"space-around",paddingTop:10,paddingBottom:Platform.OS==="ios"?17:9,backgroundColor:"#0B1B2B",borderTopWidth:1,borderColor:"#23384D"},
  navtext:{color:"#8FA2B6",fontSize:10,textAlign:"center",fontWeight:"700"},
  warning:{color:"#F3C978",fontSize:12,marginTop:10}
});
