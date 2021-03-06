import React, { Component } from 'react'
import { Text, StyleSheet, View, ActivityIndicator, ScrollView, TextInput, TouchableWithoutFeedback, Dimensions, Platform, Image, AsyncStorage, ActionSheetIOS, Linking, ToastAndroid, Modal, Alert } from 'react-native'
// import { ImagePicker, Permissions, Constants } from 'expo';
// import { IntentLauncherAndroid as IntentLauncher, ImageManipulator } from 'expo';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { Colors } from '../Components/Asset'
import { BorderlessButton, RectButton, BaseButton } from 'react-native-gesture-handler';
import { Mutation, Query } from 'react-apollo'
import gql from 'graphql-tag'
import { RNS3 } from 'react-native-aws3';;
import MyActionSheet from '../Components/MyActionSheet';
import moment from 'moment';
import { StackActions, NavigationActions } from 'react-navigation';
import Constants from 'expo-constants';
import * as ImageManipulator from 'expo-image-manipulator';
import * as IntentLauncher from 'expo-intent-launcher';
import * as ImagePicker from 'expo-image-picker';
import * as Permissions from 'expo-permissions';

const resetAction = StackActions.reset({
    index: 0,
    actions: [NavigationActions.navigate({ routeName: 'A_Bottom' })],
});


const getChoiceSubject = gql`
query getChoiceSubject($grade: Int!) {
    getChoiceSubject(grade: $grade){
        choice {
            choices
        }  
    }
}
`
const getEssentialSubject = gql`
query getResource($key: String!) {
    getResource(key: $key) {
        values
    }
}
`
const getPost = gql`
query getExamSubject($postid: String!) {
    getExamSubject(postid: $postid) {
        postid
        grade
        subject
        descriptions
        others
        pics
    }
}
`

const POST_MUTATION = gql`
    mutation updateExamSubject($postid: String!, $input: UpdateExamSubjectInput!, $adminid: String){
        updateExamSubject(postid: $postid, input: $input, adminid: $adminid) {
            postid
        }
    }
`

const WIDTH = Dimensions.get('window').width;
const MaxRatio = 1.5;

let date = moment().format('YYYYMMDDHHmmss');
let count = 0;
let URIS = [];



const options = {
    keyPrefix: "uploads/postImages/",
    bucket: "schoolapp2019",
    region: "us-west-2",
    accessKey: "AKIAIE5S35RW5QAZJQYQ",
    secretKey: "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",
    successActionStatus: 201
}



class PostScreen extends Component {
    static navigationOptions = ({ navigation }) => {
        return {
            title: '새 게시물',
            headerRight: (
                <BaseButton onPress={navigation.getParam('postHandle')} style={{ alignItems: 'center', justifyContent: 'center', height: 50, width: 50 }} >
                    <Text style={{ color: Colors.highlightBlue, fontSize: 18 }}>게시</Text>
                </BaseButton>
            ),
        }
    };

    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            isAnonymous: false,
            images: [],
            ratio: 1,
            descriptions: ['', ''],
            score1: '',
            score2: '',
            ttl1: '',
            ttl2: '',
            title: '',
            subject: '',
            others: ['', '', '', '', ''],
            isPosting: false,
            contentVisible: false,
            btnLocation: 0,
            isCameraMode: null,
            clickedTag: ["*", "*", "*", "*"],
            visible: false,
            isSuccess: false,
            isFail: false,
            userid: null,
            name: null,
            tag: [[], [], [], []],
            choiceSubject: [],
            essentialSubject: [],
            subjectVisible: false,
            postid: null,
        }
        URIS = [];
        count = 0;
        date = moment().format('YYYYMMDDHHmmss')
    }

    async componentDidMount() {
        this.props.navigation.setParams({ postHandle: this._postHandle });
        URIS = [];
        count = 0;
        date = moment().format('YYYYMMDDHHmmss');
        let id = await AsyncStorage.getItem('ID');
        this.setState({ userid: id });
        if (id === null) {
            Alert.alert('로그인해주세요');
            this.props.navigation.goBack();
        }
    }


    _postHandle = () => {
        if (this.state.ttl1 === '' || this.state.ttl2 === '' || this.state.score1 === '' || this.state.score2 === '' || this.state.subject === '') {
            if (Platform.OS === 'android') {
                ToastAndroid.show('내용을 입력해주세요', ToastAndroid.SHORT);
            } else {
                Alert.alert("(필수)내용을 입력해 주세요");
            }
            return;
        }

        if (!this.state.isPosting) {
            this.setState({ isPosting: true });
            setTimeout(() => {
                if (!this.state.isSuccess && !this.state.isFail) {
                    this.setState({ isFail: true });
                    setTimeout(() => {
                        this.props.navigation.goBack();
                    }, 500);
                }

            }, 20000);
            if (this.state.images.length > 0) {
                const imageCount = 0;
                const endPoint = this.state.images.length;
                try {
                    this._upload2S3(imageCount, endPoint);
                } catch {
                    this.setState({ isFail: true });
                    setTimeout(() => {
                        this.props.navigation.goBack();
                    }, 500);
                }

            } else {
                this._upload2Server();
            }
        }
    }
    _upload2S3(imageCount, endPoint) {
        if (this.state.images[imageCount].includes('http')) //http를 갖고 있다면...
        {
            URIS.push(this.state.images[imageCount]);
            if (imageCount === endPoint - 1) {
                this._upload2Server();
            }
            else {
                this._upload2S3(imageCount + 1, endPoint);
            }
        } else {
            ImageManipulator.manipulateAsync(this.state.images[imageCount], [], { compress: 0.7, format: 'jpeg' }).then(response => {
                RNS3.put(this.getFile(response.uri), options).then(res => {
                    URIS.push(res.body.postResponse.location);
                    if (imageCount === endPoint - 1) {
                        this._upload2Server();
                    }
                    else {
                        this._upload2S3(imageCount + 1, endPoint);
                    }
                });
            })
        }

    }
    _upload2Server() {
        const others = this.state.others.filter(d => d !== '');
        const descriptions = [`객관식 ${this.state.score1}문항 (총 ${this.state.ttl1}점)`, `서술형 ${this.state.score2}문항 (총 ${this.state.ttl2}점)`];
        const input = {
            grade: this.props.grade,
            subject: this.state.subject,
            descriptions: descriptions,
            others: others,
            pics: URIS,
        }
        try {
            this.props.uploadMutation({ variables: { postid: this.props.postid, input: input, adminid: `${this.state.userid}(${Constants.deviceName})` } }).then(response => {
                this.setState({ isSuccess: true });
                setTimeout(() => {
                    this.props.navigation.goBack();
                }, 500);
            })
        }
        catch
        {
            this.setState({ isFail: true });
            setTimeout(() => {
                this.props.navigation.goBack();
            }, 500);
        }

    }

    getFile(uri) {
        let uriParts = uri.split('.');
        let fileType = uriParts[uriParts.length - 1];

        const file = {
            uri,
            name: `${Constants.deviceName}${date}${count}.${fileType}`,
            type: `image/${fileType}`,
        };
        count++;

        return file;
    }

    _changeContent = (text) => {
        this.setState({ content: text })
    }
    _imageAddHandle = () => {
        this.setState({ visible: true })
        // if (this.state.images.length <= 0) {
        //     this.setState({ visible: true })
        // } else {
        //     if (this.state.isCameraMode === true) {
        //         this._openCamera();
        //     } else if (this.state.isCameraMode === false) {
        //         this._openGellary();
        //     }
        // }

    }
    _openCamera = () => {
        this.props.navigation.navigate('A_Camera', { changePhoto: this._changePhoto });
    }
    _changePhoto = (_uri, _ratio) => {
        const c = this.state.images.filter(() => true);
        c.push(_uri);
        this.setState({ images: c, ratio: 1 });
    }

    _openGellary = async () => {
        const permissions = await Permissions.getAsync(Permissions.CAMERA_ROLL);
        if (permissions.status === 'denied') {
            const newPermission = await Permissions.askAsync(Permissions.CAMERA_ROLL);
            if (newPermission.status === 'denied') {
                if (Platform.OS === 'ios') {
                    Alert.alert(
                        '권한',
                        '사진 > 읽기 및 쓰기 활성화',
                        [
                            { text: 'OK', onPress: () => Linking.openURL('app-settings:') },
                            {
                                text: '취소',
                                style: 'cancel',
                            },
                        ],
                        { cancelable: false },
                    );
                } else {
                    Alert.alert(
                        '권한',
                        '스크랩 > 권한 > 저장공간 활성화',
                        [
                            { text: 'OK', onPress: () => IntentLauncher.startActivityAsync(IntentLauncher.ACTION_APPLICATION_SETTINGS) },
                            {
                                text: '취소',
                                style: 'cancel',
                            },
                        ],
                        { cancelable: false },
                    );
                    // ToastAndroid.show('스크랩 > 권한 > 저장공간 활성화', ToastAndroid.LONG);

                }
            } else {
                let result;
                if (this.state.images.length <= 0) {
                    result = await ImagePicker.launchImageLibraryAsync({
                        allowsEditing: true,
                    });
                } else {
                    result = await ImagePicker.launchImageLibraryAsync({
                        allowsEditing: true,
                    });
                }

                if (!result.cancelled) {
                    const i = this.state.images.filter(() => true);
                    i.push(result.uri);
                    if (this.state.images.length === 0) {
                        this.setState({ images: i, ratio: result.width / result.height });
                    } else {
                        this.setState({ images: i });
                    }
                }
            }
        } else {
            let result;
            if (this.state.images.length <= 0) {
                result = await ImagePicker.launchImageLibraryAsync({
                    allowsEditing: true,
                });
            } else {
                result = await ImagePicker.launchImageLibraryAsync({
                    allowsEditing: true,
                });
            }

            if (!result.cancelled) {
                const i = this.state.images.filter(() => true);
                i.push(result.uri);
                if (this.state.images.length === 0) {
                    this.setState({ images: i, ratio: result.width / result.height });
                } else {
                    this.setState({ images: i });
                }
            }
        }


    }
    _actionSheetHandle(index) {
        this.setState({ visible: false });
        if (index == 0) {
            this.setState({ isCameraMode: false });
            setTimeout(() => {
                this._openGellary();
            }, 100);
        } else if (index == 1) {
            this.setState({ isCameraMode: true });
            this._openCamera();
        }
    }
    render() {
        return (
            <Query query={getEssentialSubject} variables={{ key: `essentialSubject${this.props.grade}` }} fetchPolicy='cache-and-network'
                onCompleted={data => {
                    this.setState({ essentialSubject: data.getResource.values })
                }}>
                {({ loading }) => {
                    return <Query query={getChoiceSubject} variables={{ grade: this.props.grade }} fetchPolicy='cache-and-network'
                        onCompleted={data => {
                            let d = [];
                            for (let i = 0; i < data.getChoiceSubject.choice.length; i++) {
                                d = [...d, ...data.getChoiceSubject.choice[i].choices]
                            }
                            this.setState({ choiceSubject: d })
                        }}>
                        {({ loading }) => {
                            return !this.state.loading || loading
                                ?
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size='large' color='#dddddd' /></View>
                                :
                                <View style={{ flex: 1 }}>
                                    <ScrollView showsVerticalScrollIndicator={false} overScrollMode={"never"} style={{ flex: 1 }}>
                                        <Query query={getPost} fetchPolicy='network-only' variables={{ postid: this.props.postid }}
                                            onCompleted={data => {
                                                const d = data.getExamSubject;
                                                const d1 = d.descriptions[0];
                                                const d2 = d.descriptions[1];
                                                let score1 = '';
                                                let score2 = '';
                                                let ttl1 = '';
                                                let ttl2 = '';

                                                for (let i = d1.indexOf('식') + 1; i < d1.indexOf('문'); i++) {
                                                    score1 += d1[i];
                                                }
                                                for (let i = d1.indexOf('총') + 1; i < d1.indexOf('점'); i++) {
                                                    ttl1 += d1[i];
                                                }
                                                for (let i = d2.indexOf('형') + 1; i < d2.indexOf('문'); i++) {
                                                    score2 += d2[i];
                                                }
                                                for (let i = d2.indexOf('총') + 1; i < d2.indexOf('점'); i++) {
                                                    ttl2 += d2[i];
                                                }


                                                this.setState({ subject: d.subject, images: d.pics, others: d.others, score1: score1, score2: score2, ttl1: ttl1, ttl2: ttl2 });
                                            }}>{({ loading }) => {
                                                return null;
                                            }}
                                        </Query>
                                        <BaseButton onPress={() => {
                                            this.setState({ subjectVisible: true })
                                        }} style={{ width: WIDTH }}>
                                            <View style={{ borderBottomColor: '#dbdbdb', borderBottomWidth: 0.5, flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', height: 40, marginLeft: 12 }}>
                                                    <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row' }}><Text style={{ fontSize: 14, marginLeft: 10 }}>과목 : {this.state.subject === '' ? '(필수)' : this.state.subject}</Text></View>
                                                </View>
                                            </View>
                                        </BaseButton>
                                        <View style={{ borderBottomColor: '#dbdbdb', borderBottomWidth: 0.5 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', height: 40, marginLeft: 12 }}>
                                                <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row' }}><Text style={{ fontSize: 14, marginLeft: 10 }}>사진</Text></View>
                                            </View>
                                            <ScrollView horizontal={true} overScrollMode='never' showsHorizontalScrollIndicator={false} style={{ height: 150, paddingBottom: 12 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 34 }}>
                                                    {this.state.images.map((data, index) =>
                                                        <View key={index} style={{ height: 130, width: 130 * (this.state.ratio > MaxRatio ? MaxRatio : this.state.ratio < 1 / MaxRatio ? 1 / MaxRatio : this.state.ratio), borderRadius: 10, overflow: 'hidden', marginRight: 10 }}>
                                                            <TouchableWithoutFeedback onPress={() => {
                                                                let i = this.state.images.filter(() => true);
                                                                i.splice(index, 1);
                                                                if (i.length === 0) {
                                                                    this.setState({ ratio: 1 })
                                                                }
                                                                this.setState({ images: i });
                                                            }}>
                                                                <View style={{ height: 130, width: 130 * (this.state.ratio > MaxRatio ? MaxRatio : this.state.ratio < 1 / MaxRatio ? 1 / MaxRatio : this.state.ratio) }}>
                                                                    <Image accessible source={{ uri: data }} style={{ height: 130, width: 130 * (this.state.ratio > MaxRatio ? MaxRatio : this.state.ratio < 1 / MaxRatio ? 1 / MaxRatio : this.state.ratio) }} />
                                                                    <Ionicons name='ios-close' color='white' size={30} style={{ position: 'absolute', right: 16, top: 6 }} />
                                                                </View>
                                                            </TouchableWithoutFeedback>
                                                        </View>
                                                    )}
                                                    {this.state.images.length < 9 &&
                                                        <View style={{ height: 130, width: 130 * (this.state.ratio > MaxRatio ? MaxRatio : this.state.ratio < 1 / MaxRatio ? 1 / MaxRatio : this.state.ratio), borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dbdbdb', overflow: 'hidden' }}>
                                                            <RectButton onPress={this._imageAddHandle}>
                                                                <View style={{ height: 130, width: 130 * (this.state.ratio > MaxRatio ? MaxRatio : this.state.ratio < 1 / MaxRatio ? 1 / MaxRatio : this.state.ratio), borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Ionicons name='ios-add' style={{ margin: 0 }} size={30} color='#888' />
                                                                </View>
                                                            </RectButton>
                                                        </View>}
                                                </View>
                                            </ScrollView>
                                        </View>
                                        <View style={{ borderBottomColor: '#dbdbdb', borderBottomWidth: 0.5, width: WIDTH }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', height: 40, marginLeft: 12 }}>
                                                <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row' }}><Text style={{ fontSize: 14, marginLeft: 10 }}>객관식 (필수)</Text></View>
                                            </View>
                                            <View style={{ width: WIDTH, height: 40, paddingHorizontal: 20, alignItems: 'center', flexDirection: 'row' }}>
                                                <Text>객관식</Text>
                                                <TextInput keyboardType='number-pad' value={this.state.score1} style={{ borderColor: '#dbdbdb', borderWidth: 1, width: 50 }} onChangeText={text => { this.setState({ score1: text }) }} />
                                                <Text>문항 (총 </Text>
                                                <TextInput keyboardType='number-pad' value={this.state.ttl1} style={{ borderColor: '#dbdbdb', borderWidth: 1, width: 50 }} onChangeText={text => { this.setState({ ttl1: text }) }} />
                                                <Text>점)</Text>
                                            </View>
                                        </View>
                                        <View style={{ borderBottomColor: '#dbdbdb', borderBottomWidth: 0.5, width: WIDTH }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', height: 40, marginLeft: 12 }}>
                                                <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row' }}><Text style={{ fontSize: 14, marginLeft: 10 }}>서술형 (필수)</Text></View>
                                            </View>
                                            <View style={{ width: WIDTH, height: 40, paddingHorizontal: 20, alignItems: 'center', flexDirection: 'row' }}>
                                                <Text>서술형</Text>
                                                <TextInput keyboardType='number-pad' value={this.state.score2} style={{ borderColor: '#dbdbdb', borderWidth: 1, width: 50 }} onChangeText={text => { this.setState({ score2: text }) }} />
                                                <Text>문항 (총 </Text>
                                                <TextInput keyboardType='number-pad' value={this.state.ttl2} style={{ borderColor: '#dbdbdb', borderWidth: 1, width: 50 }} onChangeText={text => { this.setState({ ttl2: text }) }} />
                                                <Text>점)</Text>
                                            </View>
                                        </View>
                                        <View style={{ borderBottomColor: '#dbdbdb', borderBottomWidth: 0.5, width: WIDTH }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', height: 40, marginLeft: 12 }}>
                                                <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row' }}><Text style={{ fontSize: 14, marginLeft: 10 }}>추가정보 (시험범위)</Text></View>
                                            </View>
                                            <View style={{ width: WIDTH, height: 40, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' }}>
                                                <TextInput placeholder='예) 자료 준비해올 것' value={this.state.others[0]} style={{ borderColor: '#dbdbdb', borderWidth: 1, width: WIDTH - 40 }} onChangeText={text => {
                                                    const d = this.state.others;
                                                    d[0] = text;
                                                    this.setState({ others: d })
                                                }
                                                } />
                                            </View>
                                            <View style={{ width: WIDTH, height: 40, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' }}>
                                                <TextInput placeholder='예) 자료 준비해올 것' value={this.state.others[1]} style={{ borderColor: '#dbdbdb', borderWidth: 1, width: WIDTH - 40 }} onChangeText={text => {
                                                    const d = this.state.others;
                                                    d[1] = text;
                                                    this.setState({ others: d })
                                                }
                                                } />
                                            </View>
                                            <View style={{ width: WIDTH, height: 40, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' }}>
                                                <TextInput placeholder='예) 자료 준비해올 것' value={this.state.others[2]} style={{ borderColor: '#dbdbdb', borderWidth: 1, width: WIDTH - 40 }} onChangeText={text => {
                                                    const d = this.state.others;
                                                    d[2] = text;
                                                    this.setState({ others: d })
                                                }
                                                } />
                                            </View>
                                            <View style={{ width: WIDTH, height: 40, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' }}>
                                                <TextInput placeholder='예) 자료 준비해올 것' value={this.state.others[3]} style={{ borderColor: '#dbdbdb', borderWidth: 1, width: WIDTH - 40 }} onChangeText={text => {
                                                    const d = this.state.others;
                                                    d[3] = text;
                                                    this.setState({ others: d })
                                                }
                                                } />
                                            </View>
                                            <View style={{ width: WIDTH, height: 40, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' }}>
                                                <TextInput placeholder='예) 자료 준비해올 것' value={this.state.others[4]} style={{ borderColor: '#dbdbdb', borderWidth: 1, width: WIDTH - 40 }} onChangeText={text => {
                                                    const d = this.state.others;
                                                    d[4] = text;
                                                    this.setState({ others: d })
                                                }
                                                } />
                                            </View>

                                        </View>

                                        <View style={{ height: 1000 }} />
                                    </ScrollView>




                                    <Modal
                                        transparent={true}
                                        visible={this.state.isPosting}
                                        onRequestClose={() => { }}
                                    >
                                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#80808080' }}>
                                            {this.state.isSuccess
                                                ?
                                                <View style={{ alignItems: 'center' }}>
                                                    <Ionicons name='ios-checkmark-circle' size={60} color={Colors.red} style={{ margin: 0 }} />
                                                    <Text style={{ fontSize: 20, color: Colors.red, marginTop: 4 }}>성공</Text>
                                                </View>
                                                :
                                                this.state.isFail
                                                    ?
                                                    <View style={{ alignItems: 'center' }}>
                                                        <AntDesign name='exclamationcircle' size={60} color={Colors.red} style={{ margin: 0 }} />
                                                        <Text style={{ fontSize: 20, color: Colors.red, marginTop: 4 }}>실패</Text>
                                                    </View>
                                                    :
                                                    <View style={{ alignItems: 'center' }}>
                                                        <ActivityIndicator size='large' color='#dddddd' />
                                                        <Text style={{ fontSize: 14, color: '#ddd', marginTop: 4 }}>게시하는 중...</Text>
                                                    </View>
                                            }

                                        </View>
                                    </Modal>
                                    <MyActionSheet
                                        visible={this.state.visible}
                                        contents={['앨범에서 가져오기', '카메라로 촬영하기']}
                                        onClicked={(data) => this._actionSheetHandle(data)}
                                        closeHandle={() => this.setState({ visible: false })} />
                                    <MyActionSheet
                                        visible={this.state.subjectVisible}
                                        contents={[...this.state.essentialSubject, ...this.state.choiceSubject]}
                                        onClicked={(data) => {
                                            this.setState({ subjectVisible: false });
                                            const d = [...this.state.essentialSubject, ...this.state.choiceSubject];
                                            this.setState({ subject: d[data] });
                                        }}
                                        closeHandle={() => this.setState({ subjectVisible: false })} />
                                </View>
                        }}
                    </Query>
                }}
            </Query>
        )
    }
}
export default class MutationContainter extends Component {
    static navigationOptions = ({ navigation }) => {
        return {
            title: '시험 수정',
            headerRight: (
                <BaseButton onPress={navigation.getParam('postHandle')} style={{ alignItems: 'center', justifyContent: 'center', height: 50, width: 50 }} >
                    <Text style={{ color: Colors.highlightBlue, fontSize: 18 }}>게시</Text>
                </BaseButton>
            ),
        }
    };

    render() {
        return (
            <Mutation mutation={POST_MUTATION} >
                {(createPost, { data }) => (
                    <PostScreen navigation={this.props.navigation} postid={this.props.navigation.state.params.postid} uploadMutation={createPost} grade={this.props.navigation.state.params.grade} />
                )
                }
            </Mutation>
        )
    }
}


const styles = StyleSheet.create({})
