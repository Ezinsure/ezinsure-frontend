// utils/rwanda-administrative.ts
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
      // Add more districts and sectors for Eastern Province
    ]
  },
  // Add other provinces (Northern, Western, Southern) with their districts and sectors
  {
    name: "Northern Province",
    districts: [
      {
        name: "Burera",
        sectors: ["Bungwe", "Butaro", "Cyanika", "Cyeru", "Gahunga", "Gatebe", "Gitovu", "Kagogo", "Kinoni", "Kinyababa", "Kivuye", "Nemba", "Rugarama", "Rugengabari", "Ruhunde", "Rusarabuye", "Rwerere"]
      },
      // Add more districts for Northern Province
    ]
  },
  {
    name: "Western Province",
    districts: [
      {
        name: "Karongi",
        sectors: ["Bwishyura", "Gashari", "Gishyita", "Gitesi", "Mubuga", "Murambi", "Murundi", "Mutuntu", "Rubengera", "Rugabano", "Ruganda", "Rwankuba", "Twumba"]
      },
      // Add more districts for Western Province
    ]
  },
  {
    name: "Southern Province",
    districts: [
      {
        name: "Huye",
        sectors: ["Gishamvu", "Huye", "Karama", "Kigoma", "Kinazi", "Maraba", "Mbazi", "Mukura", "Ngoma", "Ruhashya", "Rusatira", "Rwaniro", "Simbi", "Tumba"]
      },
      // Add more districts for Southern Province
    ]
  }
];