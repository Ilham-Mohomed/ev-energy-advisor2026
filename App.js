
import React, {useEffect,useMemo,useState} from "react";
import {
  SafeAreaView,ScrollView,View,Text,TextInput,
  TouchableOpacity,StyleSheet,StatusBar,Platform
} from "react-native";
import Svg, {
  Rect,Line,Circle,Path,G,Text as SvgText
} from "react-native-svg";

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

function Field({label,value,onChange,unit,keyboardType="default",secureTextEntry=false,autoCapitalize="sentences"}){
  return <View style={s.field}>
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
  </View>;
}

function Btn({title,onPress,secondary,disabled}){
  return <TouchableOpacity
    activeOpacity={0.75}
    onPress={onPress}
    disabled={disabled}
    style={[s.btn,secondary&&s.btn2,disabled&&s.btnDisabled]}
  >
    <Text style={[s.btntext,secondary&&s.btntext2]}>{title}</Text>
  </TouchableOpacity>;
}

function Card({children,highlight}){
  return <View style={[s.card,highlight&&s.highlightCard]}>{children}</View>;
}

function SectionTitle({children}){
  return <Text style={s.heading}>{children}</Text>;
}

/* GROUPED BEP BAR CHART */
function BEPBarChart({data}){
  const valid=data.filter(x=>x.pb!==null);
  if(!valid.length) return <Text style={s.warning}>Enter all four annual cost inputs to display the BEP comparison.</Text>;

  const max=Math.max(1,...valid.flatMap(x=>[x.pb,x.ub]))*1.2;
  const chartW=340, chartH=220;
  const left=38, right=10, top=15, bottom=38;
  const plotH=chartH-top-bottom;
  const slot=(chartW-left-right)/6;
  const barW=12;

  return <View style={s.chartWrap}>
    <Svg width="100%" height={220} viewBox="0 0 340 220">
      {[0,0.25,0.5,0.75,1].map((v,i)=>{
        const y=top+plotH*v;
        return <G key={i}>
          <Line x1={left} y1={y} x2={chartW-right} y2={y} stroke="#26394C" strokeWidth="1"/>
          <SvgText x={left-6} y={y+3} fill="#8296AA" fontSize="8" textAnchor="end">
            {(max*(1-v)).toFixed(0)}
          </SvgText>
        </G>;
      })}
      {valid.map((x,i)=>{
        const cx=left+slot*(i+0.5);
        const hp=plotH*x.pb/max;
        const hu=plotH*x.ub/max;
        return <G key={x.id}>
          <Rect x={cx-14} y={top+plotH-hp} width={barW} height={hp} rx="3" fill="#5CE6C3"/>
          <Rect x={cx+2} y={top+plotH-hu} width={barW} height={hu} rx="3" fill="#6A91E8"/>
          <SvgText x={cx} y={chartH-17} fill="#B5C5D4" fontSize="10" textAnchor="middle">{x.id}</SvgText>
        </G>;
      })}
      <Line x1={left} y1={top} x2={left} y2={top+plotH} stroke="#607487"/>
      <Line x1={left} y1={top+plotH} x2={chartW-right} y2={top+plotH} stroke="#607487"/>
    </Svg>
    <View style={s.legend}>
      <View style={s.legendItem}><View style={[s.legendDot,{backgroundColor:"#5CE6C3"}]}/><Text style={s.legendText}>Prosumer BEP</Text></View>
      <View style={s.legendItem}><View style={[s.legendDot,{backgroundColor:"#6A91E8"}]}/><Text style={s.legendText}>Utility BEP</Text></View>
    </View>
    <Text style={s.chartFoot}>BEP (Rs./kWh) · Each pair represents one scenario.</Text>
  </View>;
}

/* BEP LINE CHART */
function BEPLineChart({data}){
  const valid=data.filter(x=>x.pb!==null);
  if(!valid.length) return null;

  const max=Math.max(1,...valid.flatMap(x=>[x.pb,x.ub]))*1.2;
  const W=340,H=220,left=38,right=12,top=15,bottom=38;
  const plotH=H-top-bottom;
  const slot=(W-left-right)/5;
  const px=i=>left+slot*i;
  const py=v=>top+plotH-(v/max)*plotH;

  const makePath=key=>valid.map((x,i)=>
    `${i===0?"M":"L"} ${px(i)} ${py(x[key])}`
  ).join(" ");

  return <View style={s.chartWrap}>
    <Svg width="100%" height={220} viewBox="0 0 340 220">
      {[0,0.25,0.5,0.75,1].map((v,i)=>{
        const y=top+plotH*v;
        return <G key={i}>
          <Line x1={left} y1={y} x2={W-right} y2={y} stroke="#26394C"/>
          <SvgText x={left-6} y={y+3} fill="#8296AA" fontSize="8" textAnchor="end">{(max*(1-v)).toFixed(0)}</SvgText>
        </G>;
      })}
      <Path d={makePath("pb")} fill="none" stroke="#5CE6C3" strokeWidth="2.5" strokeLinejoin="round"/>
      <Path d={makePath("ub")} fill="none" stroke="#6A91E8" strokeWidth="2.5" strokeLinejoin="round"/>
      {valid.map((x,i)=><G key={x.id}>
        <Circle cx={px(i)} cy={py(x.pb)} r="4" fill="#5CE6C3"/>
        <Circle cx={px(i)} cy={py(x.ub)} r="4" fill="#6A91E8"/>
        <SvgText x={px(i)} y={H-17} fill="#B5C5D4" fontSize="10" textAnchor="middle">{x.id}</SvgText>
      </G>)}
      <Line x1={left} y1={top} x2={left} y2={top+plotH} stroke="#607487"/>
      <Line x1={left} y1={top+plotH} x2={W-right} y2={top+plotH} stroke="#607487"/>
    </Svg>
    <View style={s.legend}>
      <View style={s.legendItem}><View style={[s.legendLine,{backgroundColor:"#5CE6C3"}]}/><Text style={s.legendText}>Prosumer BEP</Text></View>
      <View style={s.legendItem}><View style={[s.legendLine,{backgroundColor:"#6A91E8"}]}/><Text style={s.legendText}>Utility BEP</Text></View>
    </View>
    <Text style={s.chartFoot}>BEP (Rs./kWh) · Scenario comparison.</Text>
  </View>;
}

/* FIXED / VARIABLE COST DOUGHNUT */
function DonutChart({title,fixed,variable}){
  const total=fixed+variable;
  const radius=48;
  const circumference=2*Math.PI*radius;
  const fixedLength=total>0?circumference*fixed/total:0;
  const variableLength=total>0?circumference*variable/total:0;

  return <View style={s.donutCard}>
    <Text style={s.donutTitle}>{title}</Text>
    {total<=0?
      <Text style={s.warning}>Enter fixed and variable costs.</Text>
    :
      <>
        <Svg width={130} height={130} viewBox="0 0 130 130">
          <Circle cx="65" cy="65" r={radius} stroke="#26394C" strokeWidth="17" fill="none"/>
          <Circle
            cx="65" cy="65" r={radius}
            stroke="#5CE6C3" strokeWidth="17" fill="none"
            strokeDasharray={`${fixedLength} ${circumference}`}
            rotation="-90" origin="65,65"
          />
          <Circle
            cx="65" cy="65" r={radius}
            stroke="#6A91E8" strokeWidth="17" fill="none"
            strokeDasharray={`${variableLength} ${circumference}`}
            strokeDashoffset={-fixedLength}
            rotation="-90" origin="65,65"
          />
          <SvgText x="65" y="62" fill="#F4F8FC" fontSize="11" fontWeight="bold" textAnchor="middle">
            {(total/1000).toFixed(1)}k
          </SvgText>
          <SvgText x="65" y="76" fill="#8296AA" fontSize="8" textAnchor="middle">Rs./year</SvgText>
        </Svg>
        <View style={s.donutLegend}>
          <View style={s.legendItem}><View style={[s.legendDot,{backgroundColor:"#5CE6C3"}]}/><Text style={s.legendText}>Fixed: {rs(fixed)}</Text></View>
          <View style={s.legendItem}><View style={[s.legendDot,{backgroundColor:"#6A91E8"}]}/><Text style={s.legendText}>Variable: {rs(variable)}</Text></View>
        </View>
      </>
    }
  </View>;
}

export default function App(){
  const [role,setRole]=useState("");
  const [signed,setSigned]=useState(false);
  const [tab,setTab]=useState("Home");
  const [signup,setSignup]=useState(false);
  const [profile,setProfile]=useState({name:"",email:"",phone:"",organization:""});
  const [password,setPassword]=useState("");
  const [ev,setEv]=useState(ev0);
  const [u,setU]=useState(util0);
  const [slide,setSlide]=useState(0);
  const [busy,setBusy]=useState(false);
  const [hasResults,setHasResults]=useState(false);

  useEffect(()=>{
    const t=setInterval(()=>setSlide(x=>(x+1)%6),10000);
    return ()=>clearInterval(t);
  },[]);

  const set=(setter,key,val)=>setter(o=>({...o,[key]:val}));

  const ranked=useMemo(()=>{
    const energy=n(ev.daily)*n(ev.days);
    const ready=energy>0&&
      ["pFixed","pVariable","uFixed","uVariable"].every(k=>String(u[k]).trim()!=="");

    return scenarios.map((x,i)=>{
      const factor=[1,.94,.91,.88,.82,.76][i];
      const annual=energy*factor;
      const pb=ready?(n(u.pFixed)+n(u.pVariable)*factor)/annual:null;
      const ub=ready?(n(u.uFixed)+n(u.uVariable)*factor)/annual:null;

      return {
        ...x,
        annual,
        pb,
        ub,
        gap:ready?ub-pb:null
      };
    });
  },[ev,u]);

  const find=()=>{
    setBusy(true);
    setTimeout(()=>{
      setHasResults(true);
      setBusy(false);
      setTab("Results");
    },500);
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

  const nav=["Home","Profile",role==="Customer"?"EV Details":"Utility","Results"];
  const navIcons={Home:"⌂",Profile:"◉","EV Details":"ϟ",Utility:"▦",Results:"▤"};

  if(!signed){
    return <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#070B13"/>
      <ScrollView contentContainerStyle={s.login} keyboardShouldPersistTaps="handled">
        <View style={s.logoCircle}><Text style={s.bolt}>ϟ</Text></View>
        <Text style={s.brand}>EV ENERGY</Text>
        <Text style={s.greenbrand}>ADVISOR</Text>
        <Text style={s.sub}>Smarter V2G and V2H decisions</Text>
        <Card>
          <Text style={s.heading}>{signup?"Create account":"Welcome back"}</Text>
          <Text style={s.label}>ACCOUNT TYPE</Text>
          <View style={s.roles}>
            {["Customer","Utility Officer"].map(x=><TouchableOpacity key={x} onPress={()=>setRole(x)} style={[s.role,role===x&&s.selected]}>
              <Text style={[s.roleText,role===x&&s.roleTextActive]}>{x}</Text>
            </TouchableOpacity>)}
          </View>
          <Field label="Full name" value={profile.name} onChange={v=>set(setProfile,"name",v)} autoCapitalize="words"/>
          <Field label="Email address" value={profile.email} onChange={v=>set(setProfile,"email",v)} keyboardType="email-address" autoCapitalize="none"/>
          <Field label="Password" value={password} onChange={setPassword} secureTextEntry autoCapitalize="none"/>
          <Btn title={signup?"Create account  →":"Sign in  →"} onPress={()=>{if(role){setSigned(true);setTab("Home");}}}/>
          <Btn title={signup?"Back to sign in":"Create a new account"} secondary onPress={()=>setSignup(!signup)}/>
          <Text style={s.note}>Prototype sign-in only. Secure authentication and cloud account storage must be connected before public deployment.</Text>
        </Card>
        <Text style={s.footer}>POWERING A SMARTER ENERGY FUTURE</Text>
      </ScrollView>
    </SafeAreaView>;
  }

  return <SafeAreaView style={s.safe}>
    <StatusBar barStyle="light-content" backgroundColor="#070B13"/>
    <View style={s.top}>
      <View>
        <Text style={s.topbrand}>EV <Text style={s.topbrandGreen}>ENERGY</Text></Text>
        <Text style={s.workspace}>{role} workspace</Text>
      </View>
      <TouchableOpacity style={s.signout} onPress={()=>{setSigned(false);setRole("");}}>
        <Text style={s.signoutText}>↗ Sign out</Text>
      </TouchableOpacity>
    </View>

    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {tab==="Home"&&<>
        <View style={s.hero}>
          <View style={s.heroTag}><View style={s.liveDot}/><Text style={s.heroTagText}>ENERGY INTELLIGENCE PLATFORM</Text></View>
          <Text style={s.herotitle}>Make every{"\n"}<Text style={s.heroAccent}>kilowatt count.</Text></Text>
          <Text style={s.herotext}>Compare six V2G and V2H pathways using your EV, tariff and cost assumptions.</Text>
          <View style={s.heroBottom}><Text style={s.heroBottomText}>SMART ENERGY ANALYSIS</Text><Text style={s.heroSymbol}>ϟ</Text></View>
        </View>

        <View style={s.sectionHeader}><Text style={s.sectionLabel}>EXPLORE</Text><Text style={s.sectionHint}>01 / 06</Text></View>
        <Card highlight>
          <View style={s.rowBetween}>
            <Text style={s.green}>{scenarios[slide].id} · {scenarios[slide].type}</Text>
            <View style={s.scenarioBadge}><Text style={s.scenarioBadgeText}>SCENARIO</Text></View>
          </View>
          <Text style={s.scenario}>{scenarios[slide].name}</Text>
          <Text style={s.herotext}>{scenarios[slide].desc}</Text>
          <View style={s.dots}>
            {scenarios.map((x,i)=><TouchableOpacity key={x.id} onPress={()=>setSlide(i)} style={[s.dot,i===slide&&s.doton]}/>)}
          </View>
        </Card>

        <View style={s.sectionHeader}><Text style={s.sectionLabel}>YOUR ENERGY SNAPSHOT</Text><Text style={s.sectionHint}>CURRENT INPUTS</Text></View>
        <View style={s.twocol}>
          <Card><Text style={s.statIcon}>▣</Text><Text style={s.note}>BATTERY CAPACITY</Text><Text style={s.stat}>{ev.battery}</Text><Text style={s.statUnit}>kWh</Text></Card>
          <Card><Text style={s.statIcon}>ϟ</Text><Text style={s.note}>DAILY ENERGY</Text><Text style={s.stat}>{ev.daily}</Text><Text style={s.statUnit}>kWh / day</Text></Card>
        </View>

        <View style={s.analysisCard}>
          <Text style={s.analysisEyebrow}>READY TO ANALYSE?</Text>
          <Text style={s.analysisTitle}>Explore your energy pathways.</Text>
          <Text style={s.herotext}>Evaluate all six scenarios with your current assumptions.</Text>
          <Btn title={busy?"Analysing scenarios…":"View Scenario Analysis  →"} onPress={find} disabled={busy}/>
        </View>
        <Text style={s.note}>Complete your EV and cost assumptions before analysis.</Text>
      </>}

      {tab==="Profile"&&<>
        <Text style={s.title}>Your profile</Text>
        <Text style={s.pageSubtitle}>Manage your personal and account information.</Text>
        <Card>
          <SectionTitle>Personal information</SectionTitle>
          <Field label="Full name" value={profile.name} onChange={v=>set(setProfile,"name",v)} autoCapitalize="words"/>
          <Field label="Email address" value={profile.email} onChange={v=>set(setProfile,"email",v)} keyboardType="email-address" autoCapitalize="none"/>
          <Field label="Phone number" value={profile.phone} onChange={v=>set(setProfile,"phone",v)} keyboardType="phone-pad"/>
          {role==="Utility Officer"&&<Field label="Organization" value={profile.organization} onChange={v=>set(setProfile,"organization",v)} autoCapitalize="words"/>}
        </Card>
      </>}

      {tab==="EV Details"&&<>
        <Text style={s.title}>EV & tariffs</Text>
        <Text style={s.pageSubtitle}>Configure vehicle, operating and tariff assumptions.</Text>
        <Card><SectionTitle>Vehicle & operation</SectionTitle>
          {field("Battery capacity","battery","kWh")}
          {field("Daily discharged energy","daily","kWh/day")}
          {field("Operating days","days","days/year")}
          {field("Round-trip efficiency","eff","%")}
        </Card>
        <Card><SectionTitle>Financial assumptions</SectionTitle>
          {field("Analysis period","years","years")}
          {field("Discount rate","discount","%")}
          {field("Annual escalation","escalation","%")}
          {field("V2G export value","export","Rs./kWh")}
          {field("Battery degradation","degradation","Rs./kWh")}
        </Card>
        <Card><SectionTitle>Home TOU tariff</SectionTitle>
          {field("Peak","homePeak","Rs./kWh")}
          {field("Day","homeDay","Rs./kWh")}
          {field("Off-peak","homeOff","Rs./kWh")}
        </Card>
        <Card><SectionTitle>Station retail tariff</SectionTitle>
          {field("Peak","stationPeak","Rs./kWh")}
          {field("Day","stationDay","Rs./kWh")}
          {field("Off-peak","stationOff","Rs./kWh")}
        </Card>
        <Btn title="Save EV details  ✓" onPress={()=>setTab("Home")}/>
      </>}

      {tab==="Utility"&&<>
        <Text style={s.title}>Utility settings</Text>
        <Text style={s.pageSubtitle}>Configure the economic assumptions for your analysis.</Text>
        <Card><SectionTitle>Utility assumptions</SectionTitle>
          {field("Utility energy-cost proxy","energyCost","Rs./kWh","u")}
          {field("Avoided peak-system value","avoided","Rs./kWh","u")}
        </Card>
        <Card><SectionTitle>Annual costs for BEP</SectionTitle>
          {field("Prosumer annual fixed cost","pFixed","Rs./year","u")}
          {field("Prosumer annual variable cost","pVariable","Rs./year","u")}
          {field("Utility annual fixed cost","uFixed","Rs./year","u")}
          {field("Utility annual variable cost","uVariable","Rs./year","u")}
          <Text style={s.note}>Enter approved annual cost inputs from your research workbook. BEPs are not calculated until all four values are entered.</Text>
        </Card>
        <Btn title="Save utility settings  ✓" onPress={()=>setTab("Home")}/>
      </>}

      {tab==="Results"&&<>
        <Text style={s.title}>Analysis results</Text>
        <Text style={s.pageSubtitle}>Visual comparison of all six V2G and V2H scenarios.</Text>

        {!hasResults?
          <Card>
            <Text style={s.emptyIcon}>ϟ</Text>
            <Text style={s.scenario}>No analysis yet</Text>
            <Text style={s.herotext}>Run an analysis to see your charts and scenario comparison.</Text>
            <Btn title="Run analysis  →" onPress={find}/>
          </Card>
        :
          <>
            <Card highlight>
              <Text style={s.green}>SIX-SCENARIO COMPARISON</Text>
              <Text style={s.scenario}>Explore the results visually</Text>
              <Text style={s.herotext}>The charts compare the current input assumptions. They update when you change your EV or utility inputs.</Text>
            </Card>

            <Card>
              <SectionTitle>01 · BEP comparison</SectionTitle>
              <Text style={s.herotext}>Compare the Prosumer and Utility break-even prices for each scenario.</Text>
              <BEPBarChart data={ranked}/>
            </Card>

            <Card>
              <SectionTitle>02 · BEP trend</SectionTitle>
              <Text style={s.herotext}>See how both BEP values change across S1 to S6.</Text>
              <BEPLineChart data={ranked}/>
            </Card>

            <Card>
              <SectionTitle>03 · Annual cost composition</SectionTitle>
              <Text style={s.herotext}>Compare fixed and variable annual cost inputs.</Text>
              <DonutChart title="Prosumer costs" fixed={n(u.pFixed)} variable={n(u.pVariable)}/>
              <View style={s.chartDivider}/>
              <DonutChart title="Utility costs" fixed={n(u.uFixed)} variable={n(u.uVariable)}/>
            </Card>

            <Card>
              <SectionTitle>04 · Scenario values</SectionTitle>
              {ranked.map(r=><View key={r.id} style={s.scenarioRow}>
                <View style={s.rowBetween}>
                  <Text style={s.green}>{r.id} · {r.type}</Text>
                  <Text style={s.rank}>{r.annual.toFixed(1)} kWh/year</Text>
                </View>
                <Text style={s.scenarioSmall}>{r.name}</Text>
                {r.pb===null?
                  <Text style={s.warning}>Enter all four annual cost inputs to calculate BEP.</Text>
                :
                  <>
                    <View style={s.resultLine}><Text style={s.resultLabel}>Prosumer BEP</Text><Text style={s.resultValue}>{rs(r.pb)}/kWh</Text></View>
                    <View style={s.resultLine}><Text style={s.resultLabel}>Utility BEP</Text><Text style={s.resultValue}>{rs(r.ub)}/kWh</Text></View>
                    <View style={s.resultLine}><Text style={s.green}>BEP gap (Utility − Prosumer)</Text><Text style={s.resultGreen}>{rs(r.gap)}/kWh</Text></View>
                  </>
                }
              </View>)}
            </Card>

            <Text style={s.warning}>
              Research note: These are prototype calculations using provisional scenario factors (1.00, 0.94, 0.91, 0.88, 0.82 and 0.76). Validate the scenario-specific formulas and annual costs against the approved research workbook before using these results in an official report or recommendation. The cost doughnuts show the entered annual cost inputs, not calculated savings.
            </Text>

            <Btn title="↻  Refresh analysis" onPress={find}/>
          </>
        }
      </>}
    </ScrollView>

    <View style={s.nav}>
      {nav.map(x=><TouchableOpacity key={x} onPress={()=>setTab(x)} style={[s.navItem,tab===x&&s.navItemActive]}>
        <Text style={[s.navIcon,tab===x&&s.navIconActive]}>{navIcons[x]}</Text>
        <Text style={[s.navtext,tab===x&&s.navtextActive]}>{x}</Text>
      </TouchableOpacity>)}
    </View>
  </SafeAreaView>;
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:"#070B13"},
  login:{flexGrow:1,justifyContent:"center",padding:22,paddingTop:35,paddingBottom:35},
  logoCircle:{width:76,height:76,borderRadius:26,backgroundColor:"#123A38",borderWidth:1,borderColor:"#2B7166",alignSelf:"center",alignItems:"center",justifyContent:"center",marginBottom:17},
  bolt:{fontSize:46,fontWeight:"900",color:"#5CE6C3"},
  brand:{fontSize:27,fontWeight:"900",letterSpacing:3,color:"#F4F8FC",textAlign:"center"},
  greenbrand:{fontSize:27,fontWeight:"900",letterSpacing:3,color:"#5CE6C3",textAlign:"center"},
  sub:{color:"#91A4B8",textAlign:"center",marginTop:12,marginBottom:28,fontSize:13},
  top:{backgroundColor:"#0B111D",paddingHorizontal:19,paddingVertical:15,flexDirection:"row",justifyContent:"space-between",alignItems:"center",borderBottomWidth:1,borderColor:"#1C2B3C"},
  topbrand:{fontSize:19,fontWeight:"900",letterSpacing:1,color:"#F3F8FC"},
  topbrandGreen:{color:"#5CE6C3"},
  workspace:{color:"#8296AA",fontSize:10,marginTop:4},
  signout:{backgroundColor:"#172534",borderWidth:1,borderColor:"#304254",borderRadius:12,paddingHorizontal:13,paddingVertical:9},
  signoutText:{color:"#D7E5EF",fontWeight:"700",fontSize:11},
  content:{padding:17,paddingBottom:35},
  hero:{backgroundColor:"#102D32",borderRadius:25,borderWidth:1,borderColor:"#23544F",padding:23,marginBottom:25,overflow:"hidden"},
  heroTag:{flexDirection:"row",alignItems:"center",gap:8},
  liveDot:{width:7,height:7,borderRadius:5,backgroundColor:"#5CE6C3"},
  heroTagText:{color:"#83DCC8",fontSize:9,fontWeight:"900",letterSpacing:1.3},
  herotitle:{fontSize:34,fontWeight:"900",color:"#F4FAF8",marginTop:22,lineHeight:40},
  heroAccent:{color:"#5CE6C3"},
  herotext:{color:"#A9BFBD",fontSize:12,lineHeight:20,marginTop:9},
  heroBottom:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderTopWidth:1,borderColor:"#2B5553",marginTop:22,paddingTop:14},
  heroBottomText:{color:"#83B7AE",fontSize:9,letterSpacing:1,fontWeight:"800"},
  heroSymbol:{color:"#5CE6C3",fontSize:28,fontWeight:"900"},
  sectionHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:12,marginTop:5},
  sectionLabel:{color:"#8DA3B7",fontSize:10,fontWeight:"900",letterSpacing:1.2,marginBottom:10},
  sectionHint:{color:"#526A80",fontSize:9,fontWeight:"800"},
  heading:{fontSize:17,fontWeight:"800",color:"#F4F8FC",marginBottom:12},
  title:{fontSize:29,fontWeight:"900",color:"#F4F8FC",marginTop:12,marginBottom:5},
  pageSubtitle:{color:"#91A4B8",fontSize:12,lineHeight:19,marginBottom:20},
  card:{backgroundColor:"#101B2A",borderColor:"#26384B",borderWidth:1,borderRadius:20,padding:17,marginBottom:13},
  highlightCard:{backgroundColor:"#102C2D",borderColor:"#28665B"},
  rowBetween:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  scenarioBadge:{backgroundColor:"#1B4843",borderRadius:7,paddingHorizontal:9,paddingVertical:5},
  scenarioBadgeText:{color:"#80DCC6",fontSize:8,fontWeight:"900",letterSpacing:1},
  scenario:{fontSize:21,fontWeight:"900",color:"#F2F7FC",marginTop:11},
  green:{color:"#5CE6C3",fontWeight:"900",fontSize:12},
  note:{fontSize:10,color:"#8296AA",lineHeight:16,marginTop:9},
  field:{marginBottom:16},
  label:{color:"#A9B9C9",fontSize:11,fontWeight:"700",marginBottom:8},
  inputrow:{backgroundColor:"#0A1320",borderWidth:1,borderColor:"#2B4054",borderRadius:13,paddingHorizontal:13,flexDirection:"row",alignItems:"center"},
  input:{color:"#F3F7FC",paddingVertical:13,flex:1,fontSize:14},
  unit:{color:"#5CE6C3",fontSize:10,fontWeight:"800",marginLeft:7},
  btn:{backgroundColor:"#5CE6C3",paddingVertical:16,paddingHorizontal:17,borderRadius:15,alignItems:"center",justifyContent:"center",marginTop:12,shadowColor:"#42D9B4",shadowOffset:{width:0,height:5},shadowOpacity:0.19,shadowRadius:12,elevation:4},
  btn2:{backgroundColor:"#172638",borderWidth:1,borderColor:"#344A60",shadowOpacity:0,elevation:0},
  btnDisabled:{opacity:0.6},
  btntext:{color:"#071A19",fontWeight:"900",fontSize:13,letterSpacing:0.2},
  btntext2:{color:"#DCE8F2"},
  roles:{flexDirection:"row",gap:9,marginTop:9,marginBottom:19},
  role:{flex:1,paddingVertical:14,paddingHorizontal:7,borderWidth:1,borderColor:"#2C4053",borderRadius:13,alignItems:"center",backgroundColor:"#0B1522"},
  roleText:{color:"#A8B9C9",fontSize:11,fontWeight:"700"},
  selected:{borderColor:"#5CE6C3",backgroundColor:"#123A36"},
  roleTextActive:{color:"#5CE6C3"},
  stat:{fontSize:26,fontWeight:"900",color:"#F4F8FC",marginTop:9},
  statIcon:{fontSize:21,color:"#5CE6C3",marginBottom:12},
  statUnit:{color:"#8296AA",fontSize:10,marginTop:2},
  twocol:{flexDirection:"row",gap:11,marginBottom:12},
  dots:{flexDirection:"row",gap:7,marginTop:19},
  dot:{width:7,height:7,borderRadius:8,backgroundColor:"#506B70"},
  doton:{width:25,backgroundColor:"#5CE6C3"},
  analysisCard:{backgroundColor:"#111E2D",borderWidth:1,borderColor:"#2B4054",borderRadius:21,padding:19,marginTop:5},
  analysisEyebrow:{color:"#5CE6C3",fontSize:9,fontWeight:"900",letterSpacing:1.3},
  analysisTitle:{color:"#F4F8FC",fontSize:21,fontWeight:"900",lineHeight:28,marginTop:10},
  footer:{textAlign:"center",color:"#506477",fontSize:9,letterSpacing:1.5,fontWeight:"800",marginTop:27},
  nav:{flexDirection:"row",justifyContent:"space-around",alignItems:"center",paddingTop:9,paddingBottom:Platform.OS==="ios"?18:10,paddingHorizontal:5,backgroundColor:"#0B111D",borderTopWidth:1,borderColor:"#253548"},
  navItem:{minWidth:66,alignItems:"center",justifyContent:"center",paddingVertical:7,paddingHorizontal:9,borderRadius:13},
  navItemActive:{backgroundColor:"#153832"},
  navIcon:{color:"#8195A9",fontSize:20,fontWeight:"800",marginBottom:3},
  navIconActive:{color:"#5CE6C3"},
  navtext:{color:"#8195A9",fontSize:9,fontWeight:"700"},
  navtextActive:{color:"#5CE6C3"},
  warning:{color:"#F3C978",fontSize:11,lineHeight:18,marginTop:12},
  emptyIcon:{fontSize:38,color:"#5CE6C3",fontWeight:"900"},
  rank:{color:"#8195A9",fontSize:9,fontWeight:"800"},
  chartWrap:{marginTop:12,marginBottom:5},
  legend:{flexDirection:"row",justifyContent:"center",flexWrap:"wrap",gap:18,marginTop:8},
  legendItem:{flexDirection:"row",alignItems:"center",gap:6,marginVertical:3},
  legendDot:{width:9,height:9,borderRadius:5},
  legendLine:{width:17,height:3,borderRadius:3},
  legendText:{color:"#B5C5D4",fontSize:10},
  chartFoot:{color:"#8296AA",fontSize:9,textAlign:"center",marginTop:9},
  donutCard:{alignItems:"center",paddingVertical:12},
  donutTitle:{fontSize:14,fontWeight:"800",color:"#F4F8FC",marginBottom:8},
  donutLegend:{gap:5,alignSelf:"stretch",alignItems:"center"},
  chartDivider:{height:1,backgroundColor:"#26384B",marginVertical:10},
  scenarioRow:{borderTopWidth:1,borderColor:"#26384B",paddingVertical:12},
  scenarioSmall:{fontSize:13,color:"#F2F7FC",fontWeight:"700",marginTop:5,marginBottom:7},
  resultLine:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingVertical:7},
  resultLabel:{color:"#A9B9C9",fontSize:11},
  resultValue:{color:"#F3F8FC",fontSize:12,fontWeight:"800"},
  resultGreen:{color:"#5CE6C3",fontSize:12,fontWeight:"900"}
});
