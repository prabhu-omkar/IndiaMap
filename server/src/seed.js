import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PM = 50; // basePrice = gdp * 50

// [name, code, totalGdp, capital, pop, isUT, cities:[name,code,gdp,pop]]
const S = [
["Maharashtra","MH",322400,"Mumbai",112.4,false,[["Mumbai","MH-MU",68000,12.4],["Pune","MH-PU",42000,9.4],["Nagpur","MH-NG",22000,4.7],["Thane","MH-TH",35000,11.1],["Nashik","MH-NK",18000,6.1],["Aurangabad","MH-AU",14000,3.7],["Navi Mumbai","MH-NM",16000,2.0],["Solapur","MH-SO",9500,4.3]]],
["Tamil Nadu","TN",220800,"Chennai",72.2,false,[["Chennai","TN-CH",52000,8.7],["Coimbatore","TN-CO",28000,3.5],["Madurai","TN-MD",12000,3.0],["Tiruchirappalli","TN-TR",9500,2.7],["Salem","TN-SL",8800,3.5],["Tiruppur","TN-TP",9000,2.5],["Vellore","TN-VL",6000,1.8],["Erode","TN-ER",5500,1.6]]],
["Karnataka","KA",222000,"Bengaluru",61.1,false,[["Bengaluru","KA-BG",72000,9.6],["Mysuru","KA-MY",14000,3.0],["Mangaluru","KA-MG",12000,2.1],["Hubli-Dharwad","KA-HD",9000,1.9],["Belagavi","KA-BL",11000,4.8],["Tumakuru","KA-TK",7000,2.7],["Davanagere","KA-DV",5000,1.9],["Kalaburagi","KA-KL",4500,1.5]]],
["Gujarat","GJ",194000,"Gandhinagar",60.4,false,[["Ahmedabad","GJ-AH",45000,7.2],["Surat","GJ-SU",38000,6.1],["Vadodara","GJ-VA",18000,4.2],["Rajkot","GJ-RJ",14000,3.8],["Bhavnagar","GJ-BV",7000,1.6],["Jamnagar","GJ-JN",8000,1.5],["Gandhinagar","GJ-GN",6000,0.6],["Junagadh","GJ-JU",5000,1.3]]],
["Uttar Pradesh","UP",217300,"Lucknow",199.8,false,[["Lucknow","UP-LK",22000,4.6],["Noida","UP-NO",28000,1.7],["Kanpur","UP-KN",14000,4.6],["Agra","UP-AG",11000,4.4],["Varanasi","UP-VR",9000,3.7],["Ghaziabad","UP-GZ",18000,4.7],["Prayagraj","UP-PR",8500,6.0],["Meerut","UP-ME",8000,3.4]]],
["Rajasthan","RJ",113300,"Jaipur",68.6,false,[["Jaipur","RJ-JP",24000,6.6],["Jodhpur","RJ-JO",12000,3.7],["Kota","RJ-KO",9000,2.0],["Udaipur","RJ-UD",8000,3.1],["Ajmer","RJ-AJ",6500,2.6],["Bikaner","RJ-BK",5500,2.4],["Bhilwara","RJ-BW",4500,2.4]]],
["West Bengal","WB",135000,"Kolkata",91.3,false,[["Kolkata","WB-KO",32000,4.5],["Howrah","WB-HW",9500,4.9],["Asansol","WB-AS",7000,3.5],["Siliguri","WB-SI",6000,1.5],["Durgapur","WB-DU",5500,1.8],["Bardhaman","WB-BD",7500,3.9],["Kharagpur","WB-KH",3500,1.0],["Haldia","WB-HL",4000,0.5]]],
["Telangana","TG",131000,"Hyderabad",35.0,false,[["Hyderabad","TG-HY",52000,6.8],["Warangal","TG-WR",7000,3.5],["Nizamabad","TG-NZ",4000,1.6],["Karimnagar","TG-KN",5500,3.8],["Khammam","TG-KH",3500,1.5],["Secunderabad","TG-SC",14000,3.4],["Mahbubnagar","TG-MB",3000,1.5]]],
["Andhra Pradesh","AP",140500,"Amaravati",49.4,false,[["Visakhapatnam","AP-VS",24000,4.3],["Vijayawada","AP-VJ",16000,3.4],["Guntur","AP-GN",14000,4.9],["Tirupati","AP-TP",10000,3.0],["Nellore","AP-NL",7000,3.0],["Kakinada","AP-KK",6000,1.8],["Rajahmundry","AP-RJ",5500,1.5],["Anantapur","AP-AN",8000,4.1]]],
["Kerala","KL",97800,"Thiruvananthapuram",33.4,false,[["Thiruvananthapuram","KL-TV",14000,3.3],["Kochi","KL-KC",18000,3.3],["Kozhikode","KL-KZ",10000,3.1],["Thrissur","KL-TH",9500,3.1],["Kannur","KL-KN",6000,2.5],["Kollam","KL-KL",7500,2.6],["Palakkad","KL-PK",5000,2.8]]],
["Madhya Pradesh","MP",101500,"Bhopal",72.6,false,[["Bhopal","MP-BH",14000,2.4],["Indore","MP-IN",18000,3.3],["Jabalpur","MP-JB",8000,2.5],["Gwalior","MP-GW",6500,2.0],["Ujjain","MP-UJ",5500,2.0],["Sagar","MP-SG",3500,1.3],["Rewa","MP-RW",3000,1.1],["Satna","MP-ST",2800,0.9]]],
["Punjab","PB",59500,"Chandigarh",27.7,false,[["Ludhiana","PB-LU",14000,3.5],["Amritsar","PB-AM",8000,2.5],["Jalandhar","PB-JL",7000,2.2],["Patiala","PB-PA",5500,1.9],["Bathinda","PB-BT",4500,1.4],["Mohali","PB-MH",5000,1.0],["Pathankot","PB-PK",2500,0.7]]],
["Haryana","HR",94200,"Chandigarh",25.4,false,[["Gurugram","HR-GG",22000,1.5],["Faridabad","HR-FR",14000,1.8],["Panipat","HR-PN",8000,1.2],["Ambala","HR-AB",6000,1.1],["Hisar","HR-HS",5500,1.7],["Karnal","HR-KR",4500,1.1],["Rohtak","HR-RH",4000,1.0],["Sonipat","HR-SN",4500,1.5]]],
["Bihar","BR",61200,"Patna",104.1,false,[["Patna","BR-PT",14000,5.8],["Gaya","BR-GA",4500,4.4],["Muzaffarpur","BR-MZ",5000,4.8],["Bhagalpur","BR-BG",4000,3.0],["Darbhanga","BR-DB",3500,3.9],["Purnia","BR-PU",3000,3.3],["Ara","BR-AR",2500,2.0],["Begusarai","BR-BE",2500,3.0]]],
["Odisha","OR",59700,"Bhubaneswar",42.0,false,[["Bhubaneswar","OR-BH",12000,2.3],["Cuttack","OR-CU",8000,2.6],["Rourkela","OR-RK",7000,2.1],["Berhampur","OR-BR",4000,1.5],["Sambalpur","OR-SM",4000,1.0],["Puri","OR-PU",3000,1.7],["Balasore","OR-BL",3500,2.3]]],
["Jharkhand","JH",35400,"Ranchi",33.0,false,[["Ranchi","JH-RN",9000,2.9],["Jamshedpur","JH-JS",8000,2.3],["Dhanbad","JH-DH",6500,2.7],["Bokaro","JH-BO",4500,2.1],["Hazaribagh","JH-HZ",2500,1.7],["Deoghar","JH-DG",2000,1.5],["Giridih","JH-GI",1800,1.3]]],
["Chhattisgarh","CT",36400,"Raipur",25.6,false,[["Raipur","CT-RP",10000,4.1],["Durg-Bhilai","CT-DB",7000,3.3],["Bilaspur","CT-BL",5000,2.7],["Korba","CT-KB",4500,1.2],["Rajnandgaon","CT-RN",2500,1.5],["Jagdalpur","CT-JG",1800,0.8],["Ambikapur","CT-AM",1500,0.5]]],
["Assam","AS",40900,"Dispur",31.2,false,[["Guwahati","AS-GW",10000,1.3],["Silchar","AS-SL",3000,0.6],["Dibrugarh","AS-DI",3000,1.3],["Jorhat","AS-JO",2500,1.1],["Nagaon","AS-NG",3500,2.8],["Tezpur","AS-TP",2000,0.8],["Tinsukia","AS-TN",2500,1.3]]],
["Uttarakhand","UT",29300,"Dehradun",10.1,false,[["Dehradun","UT-DD",9000,1.7],["Haridwar","UT-HR",7000,1.9],["Haldwani","UT-HL",3500,1.0],["Roorkee","UT-RK",3000,0.6],["Rishikesh","UT-RS",2000,0.3],["Kashipur","UT-KP",2500,1.2],["Rudrapur","UT-RD",2300,0.5]]],
["Himachal Pradesh","HP",18900,"Shimla",6.9,false,[["Shimla","HP-SM",4000,0.8],["Dharamshala","HP-DH",2000,0.5],["Mandi","HP-MN",2500,1.0],["Solan","HP-SO",3000,0.6],["Kullu","HP-KU",1800,0.4],["Hamirpur","HP-HM",1500,0.5],["Bilaspur","HP-BL",1200,0.4]]],
["Goa","GA",8800,"Panaji",1.5,false,[["Panaji","GA-PN",3000,0.4],["Margao","GA-MG",2500,0.3],["Vasco da Gama","GA-VS",2000,0.3],["Mapusa","GA-MP",1000,0.1],["Ponda","GA-PD",800,0.1],["Calangute","GA-CL",500,0.05],["Old Goa","GA-OG",300,0.02]]],
["Delhi","DL",93700,"New Delhi",16.8,true,[["New Delhi","DL-ND",28000,1.4],["South Delhi","DL-SD",22000,2.7],["Central Delhi","DL-CD",16000,0.6],["North Delhi","DL-NR",12000,0.9],["East Delhi","DL-ED",8000,1.7],["West Delhi","DL-WD",7000,2.5],["Dwarka","DL-DW",5000,1.0]]],
["Jammu and Kashmir","JK",19700,"Srinagar",12.3,true,[["Srinagar","JK-SR",6000,1.3],["Jammu","JK-JM",5500,1.5],["Anantnag","JK-AN",2500,1.1],["Baramulla","JK-BM",2000,1.0],["Sopore","JK-SP",1500,0.5],["Udhampur","JK-UD",1200,0.5],["Kathua","JK-KT",1000,0.6]]],
["Ladakh","LA",1200,"Leh",0.27,true,[["Leh","LA-LH",700,0.14],["Kargil","LA-KG",500,0.13]]],
["Arunachal Pradesh","AR",3500,"Itanagar",1.4,false,[["Itanagar","AR-IT",1200,0.2],["Naharlagun","AR-NH",800,0.1],["Pasighat","AR-PS",500,0.1],["Tawang","AR-TW",400,0.05],["Ziro","AR-ZR",300,0.04],["Bomdila","AR-BM",200,0.03],["Along","AR-AL",200,0.02]]],
["Manipur","MN",3300,"Imphal",2.9,false,[["Imphal","MN-IM",1500,0.5],["Thoubal","MN-TH",600,0.4],["Bishnupur","MN-BP",400,0.2],["Churachandpur","MN-CC",350,0.3],["Ukhrul","MN-UK",250,0.2],["Senapati","MN-SN",200,0.1]]],
["Meghalaya","ML",4200,"Shillong",3.0,false,[["Shillong","ML-SH",1800,0.5],["Tura","ML-TU",800,0.3],["Jowai","ML-JW",500,0.2],["Nongpoh","ML-NP",400,0.2],["Williamnagar","ML-WN",300,0.1],["Baghmara","ML-BG",200,0.1]]],
["Mizoram","MZ",2800,"Aizawl",1.1,false,[["Aizawl","MZ-AZ",1400,0.4],["Lunglei","MZ-LG",500,0.2],["Champhai","MZ-CP",300,0.1],["Serchhip","MZ-SR",200,0.08],["Kolasib","MZ-KL",200,0.08],["Lawngtlai","MZ-LW",150,0.06]]],
["Nagaland","NL",3200,"Kohima",2.0,false,[["Kohima","NL-KH",800,0.3],["Dimapur","NL-DM",1200,0.4],["Mokokchung","NL-MK",400,0.2],["Tuensang","NL-TS",300,0.2],["Wokha","NL-WK",250,0.1],["Zunheboto","NL-ZN",200,0.1]]],
["Sikkim","SK",3900,"Gangtok",0.6,false,[["Gangtok","SK-GK",2000,0.3],["Namchi","SK-NM",800,0.1],["Pelling","SK-PL",400,0.05],["Mangan","SK-MG",350,0.05],["Gyalshing","SK-GY",250,0.05],["Ravangla","SK-RV",200,0.03]]],
["Tripura","TR",6200,"Agartala",3.7,false,[["Agartala","TR-AG",3000,0.9],["Udaipur","TR-UD",1000,0.4],["Dharmanagar","TR-DH",700,0.3],["Kailashahar","TR-KS",500,0.2],["Ambassa","TR-AM",400,0.2],["Belonia","TR-BL",300,0.1]]],
];

async function main() {
  console.log('🌏 Seeding EmpireIndia database with cities...');
  await prisma.trade.deleteMany();
  await prisma.auction.deleteMany();
  await prisma.dailyChest.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.city.deleteMany();
  await prisma.state.deleteMany();
  await prisma.user.deleteMany();

  for (const s of S) {
    const [name,code,totalGdp,capital,pop,isUT,cities] = s;
    const state = await prisma.state.create({ data: {
      name, code, totalGdp, capital, population: pop, isUnionTerritory: isUT, totalCities: cities.length,
    }});
    for (const [cn,cc,cg,cp] of cities) {
      await prisma.city.create({ data: {
        name: cn, code: cc, stateId: state.id, gdp: cg, population: cp, basePrice: cg * PM,
      }});
    }
    console.log(`  ✅ ${name}: ${cities.length} cities`);
  }

  const demoUsers = [
    { username:'emperor1', email:'emperor1@empire.com', password:'password123', color:'#00ff88' },
    { username:'emperor2', email:'emperor2@empire.com', password:'password123', color:'#ff6b35' },
    { username:'emperor3', email:'emperor3@empire.com', password:'password123', color:'#8b5cf6' },
  ];
  for (const u of demoUsers) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.create({ data: { username:u.username, email:u.email, passwordHash:hash, walletBalance:5000000, color:u.color }});
  }
  console.log(`✅ ${demoUsers.length} demo users created`);
  console.log('🎉 Seeding complete!');
}

main().catch(e=>{console.error('❌',e);process.exit(1)}).finally(async()=>{await prisma.$disconnect();pool.end()});
