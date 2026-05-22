const dgram = require('dgram');
const EventEmitter = require('events');

/**
 * Classe pour contrôler les appareils Govee via l'API LAN
 * Implémente la découverte multicast et les commandes de contrôle UDP
 */
class GoveeController extends EventEmitter {
  constructor() {
    super();

    // Configuration réseau
    this.MULTICAST_ADDRESS = '239.255.255.250';
    this.SCAN_PORT = 4001;
    this.LISTEN_PORT = 4002;
    this.CONTROL_PORT = 4003;

    // Gestion des appareils découverts
    this.devices = new Map();

    // Sockets UDP
    this.scanSocket = null;
    this.listenSocket = null;
    this.controlSocket = null;

    // Configuration timeout
    this.scanTimeout = 5000; // 5 secondes pour le scan
  }

  /**
   * Initialise les sockets UDP pour la découverte et le contrôle
   */
  async initialize() {
    try {
      // Socket pour écouter les réponses des appareils (port 4002)
      this.listenSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      await new Promise((resolve, reject) => {
        this.listenSocket.on('error', reject);
        this.listenSocket.bind(this.LISTEN_PORT, () => {
          console.log(`Socket d'écoute lié au port ${this.LISTEN_PORT}`);
          resolve();
        });
      });

      // Gérer les messages reçus
      this.listenSocket.on('message', (msg, rinfo) => {
        this._handleDeviceResponse(msg, rinfo);
      });

      // Socket pour envoyer les commandes multicast (port 4001)
      this.scanSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      this.scanSocket.bind(() => {
        this.scanSocket.setBroadcast(true);
        this.scanSocket.setMulticastTTL(128);
        console.log('Socket de scan initialisé');
      });

      // Socket pour envoyer les commandes de contrôle (port 4003)
      this.controlSocket = dgram.createSocket('udp4');
      console.log('Socket de contrôle initialisé');

      console.log('GoveeController initialisé avec succès');
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      this.close();
      throw error;
    }
  }

  /**
   * Scanner le réseau pour découvrir les appareils Govee
   * @param {number} timeout - Temps d'attente en millisecondes (défaut: 5000ms)
   * @returns {Promise<Array>} - Liste des appareils découverts
   */
  async scanDevices(timeout = this.scanTimeout) {
    return new Promise((resolve, reject) => {
      if (!this.scanSocket || !this.listenSocket) {
        return reject(new Error('Sockets non initialisés. Appelez initialize() d\'abord.'));
      }

      // Réinitialiser la liste des appareils
      this.devices.clear();

      // Message de scan selon la spécification Govee
      const scanMessage = JSON.stringify({
        msg: {
          cmd: 'scan',
          data: {
            account_topic: 'reserve'
          }
        }
      });

      // Envoyer le message de scan
      this.scanSocket.send(
        scanMessage,
        this.SCAN_PORT,
        this.MULTICAST_ADDRESS,
        (err) => {
          if (err) {
            return reject(err);
          }
          console.log(`Message de scan envoyé à ${this.MULTICAST_ADDRESS}:${this.SCAN_PORT}`);
        }
      );

      // Attendre les réponses pendant le timeout
      const timeoutId = setTimeout(() => {
        const deviceList = Array.from(this.devices.values());
        console.log(`Scan terminé: ${deviceList.length} appareil(s) trouvé(s)`);
        resolve(deviceList);
      }, timeout);

      // Permettre l'annulation du timeout si nécessaire
      this._scanTimeoutId = timeoutId;
    });
  }

  /**
   * Gérer les réponses des appareils
   * @private
   */
  _handleDeviceResponse(msg, rinfo) {
    try {
      const response = JSON.parse(msg.toString());

      if (response.msg && response.msg.cmd === 'scan' && response.msg.data) {
        const deviceData = response.msg.data;
        const deviceId = deviceData.device;

        // Ajouter ou mettre à jour l'appareil
        const device = {
          id: deviceId,
          ip: deviceData.ip,
          sku: deviceData.sku,
          bleVersionHard: deviceData.bleVersionHard,
          bleVersionSoft: deviceData.bleVersionSoft,
          wifiVersionHard: deviceData.wifiVersionHard,
          wifiVersionSoft: deviceData.wifiVersionSoft,
          lastSeen: Date.now()
        };

        this.devices.set(deviceId, device);
        console.log(`Appareil découvert: ${deviceData.sku} (${deviceId}) à ${deviceData.ip}`);

        // Émettre un événement pour chaque appareil découvert
        this.emit('deviceFound', device);
      } else if (response.msg && response.msg.cmd === 'devStatus') {
        // Réponse à une requête de statut
        this.emit('deviceStatus', response.msg.data);
      }
    } catch (error) {
      console.error('Erreur lors du traitement de la réponse:', error);
    }
  }

  /**
   * Allumer ou éteindre un appareil
   * @param {string} deviceIp - Adresse IP de l'appareil
   * @param {boolean} turnOn - true pour allumer, false pour éteindre
   */
  async turnOnOff(deviceIp, turnOn) {
    const command = {
      msg: {
        cmd: 'turn',
        data: {
          value: turnOn ? 1 : 0
        }
      }
    };

    return this._sendCommand(deviceIp, command);
  }

  /**
   * Régler la luminosité d'un appareil
   * @param {string} deviceIp - Adresse IP de l'appareil
   * @param {number} brightness - Luminosité de 1 à 100
   */
  async setBrightness(deviceIp, brightness) {
    if (brightness < 1 || brightness > 100) {
      throw new Error('La luminosité doit être entre 1 et 100');
    }

    const command = {
      msg: {
        cmd: 'brightness',
        data: {
          value: brightness
        }
      }
    };

    return this._sendCommand(deviceIp, command);
  }

  /**
   * Définir la couleur RGB d'un appareil
   * @param {string} deviceIp - Adresse IP de l'appareil
   * @param {number} r - Rouge (0-255)
   * @param {number} g - Vert (0-255)
   * @param {number} b - Bleu (0-255)
   */
  async setColor(deviceIp, r, g, b) {
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
      throw new Error('Les valeurs RGB doivent être entre 0 et 255');
    }

    const command = {
      msg: {
        cmd: 'colorwc',
        data: {
          color: { r, g, b },
          colorTemInKelvin: 0
        }
      }
    };

    return this._sendCommand(deviceIp, command);
  }

  /**
   * Définir la température de couleur d'un appareil
   * @param {string} deviceIp - Adresse IP de l'appareil
   * @param {number} kelvin - Température en Kelvin (2000-9000)
   */
  async setColorTemperature(deviceIp, kelvin) {
    if (kelvin < 2000 || kelvin > 9000) {
      throw new Error('La température de couleur doit être entre 2000K et 9000K');
    }

    const command = {
      msg: {
        cmd: 'colorwc',
        data: {
          color: { r: 0, g: 0, b: 0 },
          colorTemInKelvin: kelvin
        }
      }
    };

    return this._sendCommand(deviceIp, command);
  }

  /**
   * Interroger le statut d'un appareil
   * @param {string} deviceIp - Adresse IP de l'appareil
   * @param {number} timeout - Temps d'attente pour la réponse en ms (défaut: 3000)
   * @returns {Promise<Object>} - Statut de l'appareil
   */
  async getDeviceStatus(deviceIp, timeout = 3000) {
    return new Promise((resolve, reject) => {
      const command = {
        msg: {
          cmd: 'devStatus',
          data: {}
        }
      };

      // Écouter la réponse de statut
      const statusHandler = (status) => {
        clearTimeout(timeoutId);
        resolve(status);
      };

      this.once('deviceStatus', statusHandler);

      // Timeout si pas de réponse
      const timeoutId = setTimeout(() => {
        this.removeListener('deviceStatus', statusHandler);
        reject(new Error('Timeout: Pas de réponse de l\'appareil'));
      }, timeout);

      // Envoyer la commande
      this._sendCommand(deviceIp, command).catch((err) => {
        clearTimeout(timeoutId);
        this.removeListener('deviceStatus', statusHandler);
        reject(err);
      });
    });
  }

  /**
   * Envoyer une commande à un appareil
   * @private
   * @param {string} deviceIp - Adresse IP de l'appareil
   * @param {Object} command - Commande JSON à envoyer
   */
  async _sendCommand(deviceIp, command) {
    return new Promise((resolve, reject) => {
      if (!this.controlSocket) {
        return reject(new Error('Socket de contrôle non initialisé'));
      }

      const message = JSON.stringify(command);

      this.controlSocket.send(
        message,
        this.CONTROL_PORT,
        deviceIp,
        (err) => {
          if (err) {
            console.error(`Erreur lors de l'envoi de la commande à ${deviceIp}:`, err);
            reject(err);
          } else {
            console.log(`Commande envoyée à ${deviceIp}:${this.CONTROL_PORT} - ${command.msg.cmd}`);
            resolve();
          }
        }
      );
    });
  }

  /**
   * Obtenir un appareil par son ID
   * @param {string} deviceId - ID de l'appareil
   * @returns {Object|null} - Informations de l'appareil ou null
   */
  getDevice(deviceId) {
    return this.devices.get(deviceId) || null;
  }

  /**
   * Obtenir tous les appareils découverts
   * @returns {Array} - Liste des appareils
   */
  getAllDevices() {
    return Array.from(this.devices.values());
  }

  /**
   * Fermer tous les sockets
   */
  close() {
    if (this._scanTimeoutId) {
      clearTimeout(this._scanTimeoutId);
    }

    if (this.scanSocket) {
      this.scanSocket.close();
      this.scanSocket = null;
    }

    if (this.listenSocket) {
      this.listenSocket.close();
      this.listenSocket = null;
    }

    if (this.controlSocket) {
      this.controlSocket.close();
      this.controlSocket = null;
    }

    this.devices.clear();
    console.log('GoveeController fermé');
  }
}

// Export de la classe
module.exports = GoveeController;

// Exemple d'utilisation
if (require.main === module) {
  (async () => {
    const controller = new GoveeController();

    try {
      // Initialiser le contrôleur
      await controller.initialize();

      // Scanner les appareils
      console.log('\n=== Scan des appareils Govee ===');
      const devices = await controller.scanDevices(5000);

      if (devices.length === 0) {
        console.log('Aucun appareil trouvé');
        controller.close();
        return;
      }

      // Afficher les appareils trouvés
      console.log('\n=== Appareils découverts ===');
      devices.forEach((device, index) => {
        console.log(`\n${index + 1}. ${device.sku}`);
        console.log(`   ID: ${device.id}`);
        console.log(`   IP: ${device.ip}`);
        console.log(`   BLE: ${device.bleVersionSoft} (HW: ${device.bleVersionHard})`);
        console.log(`   WiFi: ${device.wifiVersionSoft} (HW: ${device.wifiVersionHard})`);
      });

      // Exemple de contrôle sur le premier appareil
      if (devices.length > 0) {
        const device = devices[0];
        console.log(`\n=== Test de contrôle sur ${device.sku} ===`);

        // Allumer l'appareil
        console.log('Allumage de l\'appareil...');
        await controller.turnOnOff(device.ip, true);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Régler la luminosité à 50%
        console.log('Réglage de la luminosité à 50%...');
        await controller.setBrightness(device.ip, 50);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Définir une couleur rouge
        console.log('Changement de couleur en rouge...');
        await controller.setColor(device.ip, 255, 0, 0);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Définir une couleur bleue
        console.log('Changement de couleur en bleu...');
        await controller.setColor(device.ip, 0, 0, 255);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Interroger le statut
        console.log('Interrogation du statut...');
        try {
          const status = await controller.getDeviceStatus(device.ip);
          console.log('Statut de l\'appareil:', JSON.stringify(status, null, 2));
        } catch (err) {
          console.log('Impossible d\'obtenir le statut:', err.message);
        }
      }

    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      // Fermer proprement
      setTimeout(() => {
        controller.close();
        process.exit(0);
      }, 1000);
    }
  })();
}
