import http from 'k6/http';
import exec from 'k6/execution';
import { check } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  tlsAuth: [
    {
      cert: __ENV.USER_CRT,
      key: __ENV.USER_KEY,
    },
  ],
};

export function setup() {
}

export function teardown(data) {
}

export default function (data) {
  doTest();
}

async function doTest() {
  const created = Date.now()

  const name = `k6s-${created}-${uuidv4()}-${exec.scenario.iterationInTest}`

  await Promise.allSettled([
    createAddress(name, created),
    createFirewall(name, created),
    createGlobalAddress(name, created),
    createNetwork(name, created),
    createRouter(name, created),
    createSubNetwork(name, created)
  ]);

  await Promise.allSettled([
    getRequest("addresses", "v1beta1", name),
    getRequest("firewalls", "v1alpha1", name),
    getRequest("globaladdresses", "v1beta1", name),
    getRequest("networks", "v1beta1", name),
    getRequest("routers", "v1alpha1", name),
    getRequest("subnetworks", "v1beta1", name)
  ]);
}

function postRequest(url, payload, created) {
  return new Promise((resolve, reject) => {
    payload.metadata.labels = {
      "name": payload.metadata.name,
      "created": `${created}`,
      "created-by": "k6s",
      "skip-controller-manager-metadata-caching": "",
    };

    const res = http.post(url, JSON.stringify(payload));

    let checkRes = check(res, {
      'Status is 201': (r) => r.status === 201,
    });

    if (!checkRes) {
      reject();
    } else {
      resolve();
    }
  });
}

function getRequest(kind, version, name) {
  return new Promise((resolve, reject) => {
    const url = `${__ENV.API_ENDPOINT}apis/compute.gcp.crossplane.io/${version}/${kind}?labelSelector=name=${name}`;
    const res = http.get(url);
    let checkRes = check(res, {
      'Status is 200': (r) => r.status === 200,
    });

    if (!checkRes) {
      reject();
    } else {
      resolve();
    }
  });
}

function createAddress(name, created) {
  const payload = {
    "apiVersion": "compute.gcp.crossplane.io/v1beta1",
    "kind": "Address",
    "metadata": {
      "name": name
    },
    "spec": {
      "forProvider": {
        "addressType": "EXTERNAL",
        "region": "us-east1"
      },
      "providerConfigRef": {
        "name": "example"
      }
    }
  };

  return postRequest(`${__ENV.API_ENDPOINT}apis/compute.gcp.crossplane.io/v1beta1/addresses`, payload, created);
}

function createFirewall(name, created) {
  const payload = {
    "apiVersion": "compute.gcp.crossplane.io/v1alpha1",
    "kind": "Firewall",
    "metadata": {
      "name": name
    },
    "spec": {
      "forProvider": {
        "allowed": [
          {
            "IPProtocol": "tcp",
            "ports": [
              "80",
              "443"
            ]
          },
          {
            "IPProtocol": "icmp"
          }
        ],
        "sourceRanges": [
          "10.0.0.0/24"
        ],
        "networkRef": {
          "name": "example"
        }
      },
      "providerConfigRef": {
        "name": "example"
      }
    }
  };

  return postRequest(`${__ENV.API_ENDPOINT}apis/compute.gcp.crossplane.io/v1alpha1/firewalls`, payload, created);
}

function createGlobalAddress(name, created) {
  const payload = {
    "apiVersion": "compute.gcp.crossplane.io/v1beta1",
    "kind": "GlobalAddress",
    "metadata": {
      "name": name
    },
    "spec": {
      "forProvider": {
        "addressType": "INTERNAL",
        "purpose": "VPC_PEERING"
      },
      "providerConfigRef": {
        "name": "example"
      }
    }
  };

  return postRequest(`${__ENV.API_ENDPOINT}apis/compute.gcp.crossplane.io/v1beta1/globaladdresses`, payload, created);
}

function createNetwork(name, created) {
  const payload = {
    "apiVersion": "compute.gcp.crossplane.io/v1beta1",
    "kind": "Network",
    "metadata": {
      "name": name
    },
    "spec": {
      "forProvider": {
        "autoCreateSubnetworks": false,
        "routingConfig": {
          "routingMode": "REGIONAL"
        }
      },
      "providerConfigRef": {
        "name": "example"
      }
    }
  };

  return postRequest(`${__ENV.API_ENDPOINT}apis/compute.gcp.crossplane.io/v1beta1/networks`, payload, created);
}

function createRouter(name, created) {
  const payload = {
    "apiVersion": "compute.gcp.crossplane.io/v1alpha1",
    "kind": "Router",
    "metadata": {
      "name": name
    },
    "spec": {
      "forProvider": {
        "description": "A test router to verify provider-gcp changes",
        "region": "us-west1",
        "networkRef": {
          "name": "example"
        },
        "nats": [
          {
            "name": "router-nat-1",
            "minPortsPerVm": 2,
            "natIpAllocateOption": "AUTO_ONLY",
            "sourceSubnetworkIpRangesToNat": "ALL_SUBNETWORKS_ALL_IP_RANGES"
          }
        ]
      },
      "providerConfigRef": {
        "name": "default"
      }
    }
  };

  return postRequest(`${__ENV.API_ENDPOINT}apis/compute.gcp.crossplane.io/v1alpha1/routers`, payload, created);
}

function createSubNetwork(name, created) {
  const payload = {
    "apiVersion": "compute.gcp.crossplane.io/v1beta1",
    "kind": "Subnetwork",
    "metadata": {
      "name": name
    },
    "spec": {
      "forProvider": {
        "region": "us-central1",
        "ipCidrRange": "192.168.0.0/24",
        "privateIpGoogleAccess": true,
        "secondaryIpRanges": [
          {
            "rangeName": "pods",
            "ipCidrRange": "10.128.0.0/20"
          },
          {
            "rangeName": "services",
            "ipCidrRange": "172.16.0.0/16"
          }
        ],
        "networkRef": {
          "name": "example"
        }
      },
      "providerConfigRef": {
        "name": "example"
      }
    }
  };

  return postRequest(`${__ENV.API_ENDPOINT}apis/compute.gcp.crossplane.io/v1beta1/subnetworks`, payload, created);
}
