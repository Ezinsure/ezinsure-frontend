
export interface AdministrativeDivision {
  name: string;
  districts?: AdministrativeDivision[];
  sectors?: string[];
}

export const rwandaProvinces: AdministrativeDivision[] = [
  {
    name: "Kigali City",
    districts: [
      {
        name: "Gasabo",
        sectors: ["Gatsata", "Gikomero", "Jabana", "Kinyinya", "Ndera", "Nduba", "Rusororo", "Rutunga", "Kacyiru", "Kimihurura", "Remera", "Gisozi"]
      },
      {
        name: "Kicukiro",
        sectors: ["Gatenga", "Gikondo", "Kagarama", "Kanombe", "Kicukiro", "Kigarama", "Masaka", "Niboye", "Nyarugunga"]
      },
      {
        name: "Nyarugenge",
        sectors: ["Gitega", "Kanyinya", "Kigali", "Kimisagara", "Mageragere", "Muhima", "Nyakabanda", "Nyamirambo", "Nyarugenge", "Rwezamenyo"]
      }
    ]
  },
  {
    name: "Eastern Province",
    districts: [
      {
        name: "Bugesera",
        sectors: ["Gashora", "Juru", "Kamabuye", "Ntarama", "Nyamata", "Ruhuha", "Rweru", "Shyara"]
      },
      {
        name: "Gatsibo",
        sectors: ["Gatsibo", "Gitoki", "Kabarore", "Kageyo", "Kiramuruzi", "Kiziguro", "Muhura", "Murambi", "Ngarama", "Nyagihanga", "Remera", "Rugarama", "Rwimbogo"]
      },
      {
        name: "Kayonza",
        sectors: ["Gahini", "Kabare", "Kabarondo", "Mukarange", "Murama", "Murundi", "Mwiri", "Ndego", "Nyamirama", "Rukara", "Ruramira", "Rwinkwavu"]
      },
      {
        name: "Kirehe",
        sectors: ["Gahara", "Gatore", "Kigarama", "Kigina", "Kirehe", "Mahama", "Mpanga", "Musaza", "Mushikiri", "Nasho", "Nyamugari", "Nyarubuye"]
      },
      {
        name: "Ngoma",
        sectors: ["Gashanda", "Jarama", "Karembo", "Kazo", "Kibungo", "Mugesera", "Murama", "Mutenderi", "Remera", "Rukira", "Rukumberi", "Rurenge", "Sake", "Zaza"]
      },
      {
        name: "Nyagatare",
        sectors: ["Fumbwe", "Gahengeri", "Gishari", "Karenge", "Kiyombe", "Matimba", "Mimuli", "Mukama", "Musheri", "Nyagatare", "Rukomo", "Rwempasha", "Rwimiyaga", "Tabagwe"]
      },
      {
        name: "Rwamagana",
        sectors: ["Fumbwe", "Gahengeri", "Gishari", "Karenge", "Kigabiro", "Muhazi", "Munyaga", "Munyiginya", "Musha", "Muyumbu", "Mwulire", "Nyakariro", "Nzige", "Rubona"]
      }
    ]
  },
  {
    name: "Northern Province",
    districts: [
      {
        name: "Burera",
        sectors: ["Bungwe", "Butaro", "Cyanika", "Cyeru", "Gahunga", "Gatebe", "Gitovu", "Kagogo", "Kinoni", "Kinyababa", "Kivuye", "Nemba", "Rugarama", "Rugengabari", "Ruhunde", "Rusarabuye", "Rwerere"]
      },
      {
        name: "Gakenke",
        sectors: ["Busengo", "Coko", "Cyabingo", "Gakenke", "Gashenyi", "Janja", "Kamubuga", "Karambo", "Kivuruga", "Mataba", "Minazi", "Mugunga", "Muhondo", "Muyongwe", "Muzo", "Nemba", "Ruli", "Rusasa", "Rushashi"]
      },
      {
        name: "Gicumbi",
        sectors: ["Bukure", "Bwisige", "Byumba", "Cyumba", "Giti", "Kageyo", "Kaniga", "Manyagiro", "Miyove", "Mukarange", "Muko", "Mutete", "Nyamiyaga", "Nyankenke", "Rubaya", "Rukomo", "Rushaki", "Rutare", "Ruvune", "Rwamiko", "Shangasha"]
      },
      {
        name: "Musanze",
        sectors: ["Busogo", "Cyuve", "Gacaca", "Gashaki", "Gataraga", "Kimonyi", "Kinigi", "Muhoza", "Muko", "Musanze", "Nkotsi", "Nyange", "Remera", "Rwaza", "Shingiro"]
      },
      {
        name: "Rulindo",
        sectors: ["Base", "Burega", "Bushoki", "Buyoga", "Cyinzuzi", "Cyungo", "Kinihira", "Kisaro", "Masoro", "Mbogo", "Murambi", "Ngoma", "Ntarabana", "Rukozo", "Rusiga", "Shyorongi", "Tumba"]
      }
    ]
  },
  {
    name: "Western Province",
    districts: [
      {
        name: "Karongi",
        sectors: ["Bwishyura", "Gashari", "Gishyita", "Gitesi", "Mubuga", "Murambi", "Murundi", "Mutuntu", "Rubengera", "Rugabano", "Ruganda", "Rwankuba", "Twumba"]
      },
      {
        name: "Ngororero",
        sectors: ["Bwira", "Gatumba", "Hindiro", "Kageyo", "Kavumu", "Matyazo", "Muhanda", "Muhororo", "Ndaro", "Ngororero", "Nyange", "Sovu", "Tyazo"]
      },
      {
        name: "Nyabihu",
        sectors: ["Bigogwe", "Jenda", "Jomba", "Kabatwa", "Karago", "Kintobo", "Mukamira", "Muringa", "Rambura", "Rugera", "Rurembo", "Shyira"]
      },
      {
        name: "Nyamasheke",
        sectors: ["Bushekeri", "Bushenge", "Cyato", "Gihombo", "Kagano", "Kanjongo", "Karambi", "Karengera", "Kirimbi", "Macuba", "Mahembe", "Nyabitekeri", "Rangiro", "Ruharambuga", "Shangi"]
      },
      {
        name: "Rubavu",
        sectors: ["Bugeshi", "Busasamana", "Cyanzarwe", "Gisenyi", "Kanama", "Kanzenze", "Mudende", "Nyakiriba", "Nyamyumba", "Rubavu", "Rugerero"]
      },
      {
        name: "Rutsiro",
        sectors: ["Boneza", "Gihango", "Kigeyo", "Kivumu", "Manihira", "Mukura", "Murunda", "Musasa", "Mushonyi", "Mushubati", "Nyabirasi", "Ruhango", "Rusebeya"]
      },
      {
        name: "Rusizi",
        sectors: ["Bugarama", "Butare", "Bweyeye", "Gashonga", "Giheke", "Gihundwe", "Gikundamvura", "Gitambi", "Kamembe", "Muganza", "Mururu", "Nkanka", "Nkombo", "Nkungu", "Nyakabuye", "Nyakarenzo", "Nzahaha", "Rwimbogo"]
      }
    ]
  },
  {
    name: "Southern Province",
    districts: [
      {
        name: "Huye",
        sectors: ["Gishamvu", "Huye", "Karama", "Kigoma", "Kinazi", "Maraba", "Mbazi", "Mukura", "Ngoma", "Ruhashya", "Rusatira", "Rwaniro", "Simbi", "Tumba"]
      },
      {
        name: "Gisagara",
        sectors: ["Gikonko", "Gishubi", "Kansi", "Kibilizi", "Kigembe", "Mamba", "Muganza", "Mugombwa", "Mukindo", "Musha", "Ndora", "Nyanza", "Save"]
      },
      {
        name: "Kamonyi",
        sectors: ["Gacurabwenge", "Karama", "Kayenzi", "Kayumbu", "Mugina", "Musambira", "Ngamba", "Nyamiyaga", "Nyarubaka", "Rugarika", "Rukoma", "Runda"]
      },
      {
        name: "Muhanga",
        sectors: ["Cyeza", "Kabacuzi", "Kibangu", "Kiyumba", "Muhanga", "Mushishiro", "Nyabinoni", "Nyamabuye", "Nyarusange", "Rongi", "Rugendabari", "Shyogwe"]
      },
      {
        name: "Nyamagabe",
        sectors: ["Buruhukiro", "Cyanika", "Gasaka", "Gatare", "Kaduha", "Kamegeli", "Kibirizi", "Kibumbwe", "Kitabi", "Mbazi", "Mugano", "Musange", "Musebeya", "Mushubi", "Nkomane", "Tare", "Uwinkingi"]
      },
      {
        name: "Nyanza",
        sectors: ["Busasamana", "Busoro", "Cyabakamyi", "Kibilizi", "Kigoma", "Mukingo", "Muyira", "Ntyazo", "Nyagisozi", "Rwabicuma", "Rwabutazi"]
      },
      {
        name: "Nyaruguru",
        sectors: ["Busanze", "Cyahinda", "Kibeho", "Kivu", "Mata", "Muganza", "Munini", "Musanze", "Mushubi", "Ngera", "Ngoma", "Nyabimata", "Nyagisozi", "Ruheru", "Ruramba", "Rusenge"]
      },
      {
        name: "Ruhango",
        sectors: ["Bweramana", "Byimana", "Kabagali", "Kinazi", "Kinihira", "Mbuye", "Mwendo", "Ntongwe", "Ruhango", "Rusarabuye", "Rweru"]
      }
    ]
  }
];